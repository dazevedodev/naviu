import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// A doc pública da Kiwify não detalha o payload exato do evento de compra —
// só confirma que cada webhook carrega um `token` na querystring e o envelope
// genérico. Por isso a extração de e-mail/status abaixo é defensiva (tenta
// vários formatos plausíveis) e o payload cru é sempre logado para ajustar
// contra um teste real disparado pelo dashboard da Kiwify.

const PLANOS_POR_PRODUTO: Record<string, { plano: "solo" | "barbearia"; limite_barbeiros: number }> = {
  // TODO: preencher com o product_id real de cada plano no dashboard da Kiwify.
  // "id-do-produto-solo": { plano: "solo", limite_barbeiros: 1 },
  // "id-do-produto-barbearia": { plano: "barbearia", limite_barbeiros: 10 },
};

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

function tokenValido(request: NextRequest): boolean {
  const esperado = process.env.KIWIFY_WEBHOOK_TOKEN;
  const recebido = request.nextUrl.searchParams.get("token");
  if (!esperado || !recebido) return false;

  const bufEsperado = Buffer.from(esperado);
  const bufRecebido = Buffer.from(recebido);
  if (bufEsperado.length !== bufRecebido.length) return false;
  return timingSafeEqual(bufEsperado, bufRecebido);
}

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

export async function POST(request: NextRequest) {
  if (!tokenValido(request)) {
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

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("barbearia_id")
    .eq("email", email)
    .maybeSingle();

  if (!usuario) {
    console.warn(`[kiwify webhook] nenhum usuário encontrado para ${email}.`);
    return NextResponse.json({ ok: true });
  }

  const update: Record<string, unknown> = {};

  if (STATUS_APROVADOS.has(status)) {
    update.assinatura_status = "ativa";
    const validoAte = new Date();
    validoAte.setDate(validoAte.getDate() + 30);
    update.assinatura_valido_ate = validoAte.toISOString();

    const produtoId = extrairProdutoId(payload);
    const plano = produtoId ? PLANOS_POR_PRODUTO[produtoId] : null;
    if (plano) {
      update.plano = plano.plano;
      update.limite_barbeiros = plano.limite_barbeiros;
    }
  } else if (STATUS_CANCELADOS.has(status)) {
    update.assinatura_status = "cancelada";
  } else {
    console.warn(`[kiwify webhook] status "${status}" não mapeado, ignorando.`);
    return NextResponse.json({ ok: true });
  }

  await supabase.from("barbearias").update(update).eq("id", usuario.barbearia_id);

  return NextResponse.json({ ok: true });
}
