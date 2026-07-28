import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// A doc pública da Kiwify não detalha o payload exato do evento de compra —
// só confirma que cada webhook carrega um `token` na querystring e o envelope
// genérico. Por isso a extração de e-mail/status abaixo é defensiva (tenta
// vários formatos plausíveis) e o payload cru é sempre logado para ajustar
// contra um teste real disparado pelo dashboard da Kiwify.

// Produto principal (assinatura Solo/Barbearia) na Kiwify — um produto só,
// com as duas ofertas dentro dele (cada uma com checkout próprio, mas o
// MESMO product_id no webhook). Por isso não dá pra diferenciar o plano
// só pelo product_id; ver `determinarPlano` abaixo.
const PRODUTO_ID_PLANO_PRINCIPAL = process.env.KIWIFY_PRODUTO_ID_PLANO_PRINCIPAL;

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

// Alguns campos (ex.: valor pago) podem vir como number ou como string
// dependendo do endpoint/versão do payload da Kiwify.
function primeiroNumero(valores: unknown[]): number | null {
  const encontrado = valores.find((v) => typeof v === "number" || typeof v === "string");
  if (typeof encontrado === "number") return encontrado;
  if (typeof encontrado === "string") {
    const n = Number(encontrado);
    return Number.isFinite(n) ? n : null;
  }
  return null;
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

// Solo e Barbearia são duas ofertas do MESMO produto na Kiwify (mesmo
// product_id, checkout separado), então precisa de outro jeito de saber
// qual foi comprada. Tenta achar o nome do plano/oferta em campos
// plausíveis primeiro; se não achar, usa o valor pago como heurística —
// Solo é R$24,90/mês e Barbearia é R$69,90/mês, bem separados.
function determinarPlano(
  payload: unknown,
): { plano: "solo" | "barbearia"; limite_barbeiros: number } | null {
  const nomePlano = primeiraString([
    campo(payload, "Subscription.plan.name"),
    campo(payload, "subscription.plan.name"),
    campo(payload, "plan.name"),
    campo(payload, "plan_name"),
    campo(payload, "Product.plan_name"),
    campo(payload, "offer.name"),
  ])?.toLowerCase();

  if (nomePlano?.includes("barbearia")) return { plano: "barbearia", limite_barbeiros: 10 };
  if (nomePlano?.includes("solo")) return { plano: "solo", limite_barbeiros: 1 };

  const valorPago = primeiroNumero([
    campo(payload, "Commissions.charge_amount"),
    campo(payload, "charge_amount"),
    campo(payload, "amount"),
    campo(payload, "product_base_price"),
  ]);

  if (valorPago !== null && valorPago > 0) {
    // valores da Kiwify costumam vir em centavos; normaliza pra reais.
    const emReais = valorPago > 1000 ? valorPago / 100 : valorPago;
    return emReais >= 40
      ? { plano: "barbearia", limite_barbeiros: 10 }
      : { plano: "solo", limite_barbeiros: 1 };
  }

  return null;
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

  const produtoId = extrairProdutoId(payload);
  const update: Record<string, unknown> = {};

  if (produtoId && PRODUTO_ADDON_SINAL && produtoId === PRODUTO_ADDON_SINAL) {
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
  } else if (produtoId && PRODUTO_ID_PLANO_PRINCIPAL && produtoId !== PRODUTO_ID_PLANO_PRINCIPAL) {
    // product_id de algo que não reconhecemos (nem addon, nem plano
    // principal) — não mexe em nada pra não arriscar liberar acesso à toa.
    console.warn(`[kiwify webhook] product_id "${produtoId}" não reconhecido, ignorando.`);
    return NextResponse.json({ ok: true });
  } else if (STATUS_APROVADOS.has(status)) {
    update.assinatura_status = "ativa";
    const validoAte = new Date();
    validoAte.setDate(validoAte.getDate() + 30);
    update.assinatura_valido_ate = validoAte.toISOString();

    const plano = determinarPlano(payload);
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

  await supabase.from("barbearias").update(update).eq("id", usuario.barbearia_id);

  return NextResponse.json({ ok: true });
}
