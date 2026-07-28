import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { gerarSlugUnico } from "@/lib/slug";
import { tokenDaQueryValido } from "@/lib/verificar-token";

// A doc pública da Kiwify não detalha o payload exato do evento de compra —
// só confirma que cada webhook carrega um `token` na querystring e o envelope
// genérico. Por isso a extração de e-mail/status abaixo é defensiva (tenta
// vários formatos plausíveis) e o payload cru é sempre logado para ajustar
// contra um teste real disparado pelo dashboard da Kiwify.

// Solo e Barbearia são dois produtos separados na Kiwify (cada um com seu
// próprio product_id e checkout), então o plano é determinado direto pelo
// product_id que chega no webhook — sem heurística por nome/valor pago.
const PRODUTO_ID_SOLO = process.env.KIWIFY_PRODUTO_ID_PLANO_SOLO;
const PRODUTO_ID_BARBEARIA = process.env.KIWIFY_PRODUTO_ID_PLANO_BARBEARIA;

// Complemento pago (R$15/mês) que libera o sinal via PIX — produto separado
// da assinatura do plano, não mexe em `plano`/`assinatura_status`.
const PRODUTO_ADDON_SINAL = process.env.KIWIFY_PRODUTO_ID_ADDON_SINAL;

const STATUS_APROVADOS = new Set(["paid", "approved", "aprovado", "renewed"]);
const STATUS_CANCELADOS = new Set([
  "refused",
  "canceled",
  "cancelled",
  "cancelado",
  "refunded",
  "chargedback",
  "chargeback",
]);

// Acessa um caminho tipo "Customer.email" num objeto de formato desconhecido,
// sem recorrer a `any`.
function campo(payload: unknown, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((atual, chave) => {
    if (atual && typeof atual === "object" && chave in atual) {
      return (atual as Record<string, unknown>)[chave];
    }
    return undefined;
  }, payload);
}

function primeiraString(valores: unknown[]): string | null {
  const encontrado = valores.find((v) => typeof v === "string");
  return typeof encontrado === "string" ? encontrado : null;
}

function extrairEmail(payload: unknown): string | null {
  const candidatos = [
    campo(payload, "Customer.email"),
    campo(payload, "customer.email"),
    campo(payload, "buyer.email"),
    campo(payload, "Buyer.email"),
    campo(payload, "email"),
  ];
  const email = candidatos.find((c) => typeof c === "string" && c.includes("@"));
  return typeof email === "string" ? email : null;
}

function extrairNomeComprador(payload: unknown): string | null {
  return primeiraString([
    campo(payload, "Customer.full_name"),
    campo(payload, "customer.full_name"),
    campo(payload, "Customer.name"),
    campo(payload, "customer.name"),
    campo(payload, "Buyer.full_name"),
    campo(payload, "buyer.name"),
  ]);
}

function extrairStatus(payload: unknown): string | null {
  const encontrado = primeiraString([
    campo(payload, "order_status"),
    campo(payload, "status"),
    campo(payload, "webhook_event_type"),
    campo(payload, "event"),
  ]);
  return encontrado ? encontrado.toLowerCase() : null;
}

function extrairProdutoId(payload: unknown): string | null {
  return primeiraString([
    campo(payload, "Product.product_id"),
    campo(payload, "product.id"),
    campo(payload, "product_id"),
  ]);
}

function planoPorProdutoId(
  produtoId: string | null,
): { plano: "solo" | "barbearia"; limite_barbeiros: number } | null {
  if (produtoId && PRODUTO_ID_SOLO && produtoId === PRODUTO_ID_SOLO) {
    return { plano: "solo", limite_barbeiros: 1 };
  }
  if (produtoId && PRODUTO_ID_BARBEARIA && produtoId === PRODUTO_ID_BARBEARIA) {
    return { plano: "barbearia", limite_barbeiros: 10 };
  }
  return null;
}

// Chamada quando um pagamento do plano principal é aprovado pra um e-mail
// que ainda não tem conta no Naviu — cria barbearia+usuário+login sozinho
// e manda um e-mail de "defina sua senha" (via Supabase) pra pessoa entrar
// pela primeira vez. Ela edita o nome da barbearia depois, em Configurações.
async function criarContaAutomaticamente(
  supabase: ReturnType<typeof createServiceRoleClient>,
  payload: unknown,
  email: string,
): Promise<string | null> {
  const nomeComprador = extrairNomeComprador(payload) ?? email.split("@")[0];
  const nomeBarbearia = `Barbearia de ${nomeComprador}`;

  const slug = await gerarSlugUnico(nomeBarbearia, async (candidato) => {
    const { data } = await supabase
      .from("barbearias")
      .select("id")
      .eq("slug", candidato)
      .maybeSingle();
    return Boolean(data);
  });

  const { data: authUser, error: erroAuth } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (erroAuth || !authUser.user) {
    console.error(`[kiwify webhook] falha criando usuário de auth pra ${email}:`, erroAuth?.message);
    return null;
  }

  const { data: barbearia, error: erroBarbearia } = await supabase
    .from("barbearias")
    .insert({ nome: nomeBarbearia, slug })
    .select("id")
    .single();

  if (erroBarbearia || !barbearia) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    console.error(`[kiwify webhook] falha criando barbearia pra ${email}:`, erroBarbearia?.message);
    return null;
  }

  const { error: erroUsuario } = await supabase.from("usuarios").insert({
    barbearia_id: barbearia.id,
    auth_user_id: authUser.user.id,
    nome: nomeComprador,
    email,
  });

  if (erroUsuario) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    await supabase.from("barbearias").delete().eq("id", barbearia.id);
    console.error(`[kiwify webhook] falha vinculando usuário pra ${email}:`, erroUsuario.message);
    return null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://naviu.app.br";
  const { error: erroEmail } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/redefinir-senha`,
  });
  if (erroEmail) {
    console.error(`[kiwify webhook] conta criada mas falhou mandando e-mail de senha pra ${email}:`, erroEmail.message);
  }

  return barbearia.id;
}

export async function POST(request: NextRequest) {
  if (!tokenDaQueryValido(request, "KIWIFY_WEBHOOK_TOKEN")) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const payload = await request.json();
  console.log("[kiwify webhook] payload recebido:", JSON.stringify(payload));

  const email = extrairEmail(payload);
  const status = extrairStatus(payload);

  if (!email || !status) {
    console.warn("[kiwify webhook] não deu para extrair email/status do payload.");
    return NextResponse.json({ ok: true }); // 200 pra Kiwify não ficar reentregando
  }

  const supabase = createServiceRoleClient();
  const produtoId = extrairProdutoId(payload);

  const ehProdutoAddon = Boolean(
    produtoId && PRODUTO_ADDON_SINAL && produtoId === PRODUTO_ADDON_SINAL,
  );
  const ehProdutoPlano = Boolean(planoPorProdutoId(produtoId));
  const ehProdutoDesconhecido = Boolean(produtoId && !ehProdutoAddon && !ehProdutoPlano);

  if (ehProdutoDesconhecido) {
    // product_id de algo que não reconhecemos (nem addon, nem plano
    // principal) — não mexe em nada pra não arriscar liberar acesso à toa.
    console.warn(`[kiwify webhook] product_id "${produtoId}" não reconhecido, ignorando.`);
    return NextResponse.json({ ok: true });
  }

  const { data: usuarioExistente } = await supabase
    .from("usuarios")
    .select("barbearia_id")
    .eq("email", email)
    .maybeSingle();

  let barbeariaId = usuarioExistente?.barbearia_id as string | undefined;

  if (!barbeariaId) {
    if (ehProdutoAddon) {
      // O complemento do sinal só aparece dentro do painel de uma conta já
      // existente — se não achou usuário, não tem o que fazer aqui.
      console.warn(`[kiwify webhook] nenhum usuário encontrado para ${email} (complemento do sinal).`);
      return NextResponse.json({ ok: true });
    }

    if (!STATUS_APROVADOS.has(status)) {
      // não cria conta nova por causa de um evento de cancelamento/recusa
      // pra um e-mail que a gente nem conhece.
      console.warn(`[kiwify webhook] nenhum usuário encontrado para ${email}.`);
      return NextResponse.json({ ok: true });
    }

    const novaBarbeariaId = await criarContaAutomaticamente(supabase, payload, email);
    if (!novaBarbeariaId) return NextResponse.json({ ok: true });
    barbeariaId = novaBarbeariaId;
  }

  const update: Record<string, unknown> = {};

  if (ehProdutoAddon) {
    // Compra do complemento do sinal — produto separado da assinatura do
    // plano principal, então só mexe em sinal_addon_status.
    if (STATUS_APROVADOS.has(status)) {
      update.sinal_addon_status = "ativo";
    } else if (STATUS_CANCELADOS.has(status)) {
      update.sinal_addon_status = "inativo";
      update.sinal_ativo = false; // desliga o sinal se o complemento não está mais pago
    } else {
      console.warn(`[kiwify webhook] status "${status}" não mapeado, ignorando.`);
      return NextResponse.json({ ok: true });
    }
  } else if (STATUS_APROVADOS.has(status)) {
    update.assinatura_status = "ativa";
    const validoAte = new Date();
    validoAte.setDate(validoAte.getDate() + 30);
    update.assinatura_valido_ate = validoAte.toISOString();

    const plano = planoPorProdutoId(produtoId);
    if (plano) {
      update.plano = plano.plano;
      update.limite_barbeiros = plano.limite_barbeiros;
    } else {
      console.warn("[kiwify webhook] não deu pra determinar qual plano (solo/barbearia) foi comprado.");
    }
  } else if (STATUS_CANCELADOS.has(status)) {
    update.assinatura_status = "cancelada";
  } else {
    console.warn(`[kiwify webhook] status "${status}" não mapeado, ignorando.`);
    return NextResponse.json({ ok: true });
  }

  if (Object.keys(update).length > 0) {
    await supabase.from("barbearias").update(update).eq("id", barbeariaId);
  }

  return NextResponse.json({ ok: true });
}
