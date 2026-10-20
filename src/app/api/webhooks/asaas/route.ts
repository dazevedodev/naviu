import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { asaas, type AssinaturaAsaas, type PagamentoAsaas } from "@/lib/asaas";
import { cobreAte } from "@/lib/assinatura";

// Recebe os avisos do Asaas (pagamento confirmado, vencido, assinatura
// cancelada) e atualiza a assinatura da barbearia. Só aceita chamadas com o
// token combinado (ASAAS_WEBHOOK_TOKEN), que o Asaas manda no cabeçalho
// asaas-access-token.
//
// A conta do Asaas é a mesma de outros produtos, então chegam avisos que não
// são do Naviu: tudo que não bate com uma assinatura nossa é ignorado. E o
// token sozinho não prova nada — cada pagamento é conferido de novo na API
// antes de mudar qualquer coisa.

const PAGO = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"];

type Evento = {
  event?: string;
  payment?: { id: string; subscription?: string };
  subscription?: { id: string };
};

// 200 sempre que o aviso foi entendido (mesmo ignorado), pro Asaas não
// pausar a fila de entregas.
const ok = () => NextResponse.json({ recebido: true });

function tokenValido(request: NextRequest): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  const recebido = request.headers.get("asaas-access-token");
  if (!esperado || !recebido) return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(recebido);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!tokenValido(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const evento = (await request.json().catch(() => ({}))) as Evento;
  const assinaturaId = evento.payment?.subscription ?? evento.subscription?.id;
  if (!assinaturaId) return ok(); // cobrança avulsa: não é assinatura do Naviu

  const supabase = createServiceRoleClient();
  const { data: atual } = await supabase
    .from("assinaturas")
    .select("barbearia_id")
    .eq("asaas_assinatura_id", assinaturaId)
    .maybeSingle();
  if (!atual) return ok(); // assinatura de outro produto da conta

  const { data: barbearia } = await supabase
    .from("barbearias")
    .select("assinatura_valido_ate")
    .eq("id", atual.barbearia_id)
    .single();

  // Confere na API: o pagamento (ou a assinatura) existe e está como o aviso diz.
  const chamar = asaas();
  let pagamento: PagamentoAsaas | null = null;
  if (evento.payment) {
    pagamento = await chamar<PagamentoAsaas>(
      `/payments/${encodeURIComponent(evento.payment.id)}`,
    ).catch(() => null);
    if (!pagamento || pagamento.subscription !== assinaturaId) return ok();
  } else {
    const real = await chamar<AssinaturaAsaas>(
      `/subscriptions/${encodeURIComponent(assinaturaId)}`,
    ).catch(() => null);
    if (!real || (!real.deleted && real.status === "ACTIVE")) return ok();
  }

  const agora = new Date().toISOString();
  const mudarBarbearia = (campos: Record<string, unknown>) =>
    supabase.from("barbearias").update(campos).eq("id", atual.barbearia_id);
  const mudarAssinatura = (campos: Record<string, unknown>) =>
    supabase
      .from("assinaturas")
      .update({ ...campos, atualizado_em: agora })
      .eq("barbearia_id", atual.barbearia_id);
  const linkSeguro = (url?: string) => (url?.startsWith("https://") ? url : null);

  switch (evento.event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED": {
      if (!pagamento || !PAGO.includes(pagamento.status)) break;
      const novo = cobreAte(pagamento.dueDate);
      const anterior = barbearia?.assinatura_valido_ate
        ? new Date(barbearia.assinatura_valido_ate)
        : null;
      // Nunca encurta: um pagamento antigo confirmado depois não reduz a validade.
      const validade = anterior && anterior > novo ? anterior : novo;
      await mudarBarbearia({
        assinatura_status: "ativa",
        assinatura_valido_ate: validade.toISOString(),
      });
      await mudarAssinatura({ fatura_url: null });
      break;
    }
    case "PAYMENT_CREATED":
    case "PAYMENT_UPDATED":
      if (linkSeguro(pagamento?.invoiceUrl)) {
        await mudarAssinatura({ fatura_url: pagamento!.invoiceUrl });
      }
      break;
    case "PAYMENT_OVERDUE":
      if (pagamento?.status !== "OVERDUE") break;
      await mudarBarbearia({ assinatura_status: "atrasada" });
      await mudarAssinatura({ fatura_url: linkSeguro(pagamento.invoiceUrl) });
      break;
    case "SUBSCRIPTION_DELETED":
    case "SUBSCRIPTION_INACTIVATED":
      await mudarBarbearia({ assinatura_status: "cancelada" });
      await mudarAssinatura({ fatura_url: null });
      break;
  }
  return ok();
}
