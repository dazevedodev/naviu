"use server";

import { revalidatePath } from "next/cache";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  AsaasNaoConfigurado,
  PREFIXO_REFERENCIA,
  asaas,
  faturaAberta,
} from "@/lib/asaas";
import { dataSP, hojeSP } from "@/lib/assinatura";
import { buscarPlano, type PlanoId } from "@/lib/planos";

type Resultado = { error: string | null; faturaUrl?: string | null };

type Forma = "cartao" | "pix_boleto";

type LinhaAssinatura = {
  barbearia_id: string;
  plano: PlanoId;
  forma: Forma;
  asaas_cliente_id: string | null;
  asaas_assinatura_id: string | null;
};

// Cartão: o Asaas guarda o cartão no primeiro pagamento e cobra sozinho todo
// mês. "UNDEFINED" deixa o cliente escolher Pix ou boleto em cada fatura.
const TIPO_COBRANCA: Record<Forma, string> = {
  cartao: "CREDIT_CARD",
  pix_boleto: "UNDEFINED",
};

function lerForma(valor: FormDataEntryValue | null): Forma {
  return valor === "pix_boleto" ? "pix_boleto" : "cartao";
}

async function contexto() {
  const barbearia = await getBarbeariaAtual();
  const admin = createServiceRoleClient();
  const { data: atual } = await admin
    .from("assinaturas")
    .select("barbearia_id, plano, forma, asaas_cliente_id, asaas_assinatura_id")
    .eq("barbearia_id", barbearia.id)
    .maybeSingle<LinhaAssinatura>();
  return { barbearia, admin, atual, chamar: asaas() };
}

// Erros do Asaas viram mensagem pra pessoa; falta de chave vira aviso genérico.
async function comAsaas(acao: () => Promise<Resultado>): Promise<Resultado> {
  try {
    return await acao();
  } catch (e) {
    if (e instanceof AsaasNaoConfigurado) {
      return { error: "A cobrança ainda não está ligada. Tente de novo mais tarde." };
    }
    console.error("[assinatura]", (e as Error).message);
    return { error: (e as Error).message || "Não foi possível falar com o Asaas." };
  } finally {
    revalidatePath("/admin", "layout");
  }
}

async function contarBarbeirosAtivos(barbeariaId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("barbeiros")
    .select("id", { count: "exact", head: true })
    .eq("barbearia_id", barbeariaId)
    .eq("ativo", true);
  return count ?? 0;
}

export async function assinar(formData: FormData): Promise<Resultado> {
  const plano = buscarPlano(String(formData.get("plano") ?? ""));
  if (!plano) return { error: "Escolha um plano." };
  const forma = lerForma(formData.get("forma"));
  const documento = String(formData.get("cpf_cnpj") ?? "").replace(/\D/g, "");

  return comAsaas(async () => {
    const { barbearia, admin, atual, chamar } = await contexto();

    // Já tem assinatura ativa no Asaas: só devolve a fatura em aberto.
    if (atual?.asaas_assinatura_id && barbearia.assinatura_status !== "cancelada") {
      const p = await faturaAberta(chamar, atual.asaas_assinatura_id);
      return { error: null, faturaUrl: p?.invoiceUrl ?? null };
    }

    if (plano.limiteBarbeiros < (await contarBarbeirosAtivos(barbearia.id))) {
      return {
        error: `Você tem mais barbeiros ativos do que o plano ${plano.nome} permite. Desative alguns ou escolha o plano Barbearia.`,
      };
    }

    let clienteId = atual?.asaas_cliente_id ?? null;
    if (!clienteId) {
      if (documento.length !== 11 && documento.length !== 14) {
        return { error: "Informe um CPF (11 números) ou CNPJ (14 números)." };
      }
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const cliente = await chamar<{ id: string }>("/customers", {
        method: "POST",
        body: {
          name: barbearia.nome,
          email: user?.email,
          cpfCnpj: documento,
          mobilePhone: barbearia.telefone_whatsapp?.replace(/\D/g, "") || undefined,
          externalReference: `${PREFIXO_REFERENCIA}${barbearia.id}`,
        },
      });
      clienteId = cliente.id;
    }

    // Quem assina durante o teste (ou com mês já pago) só paga quando ele acaba.
    const hoje = hojeSP();
    const fimDoPeriodo = barbearia.assinatura_valido_ate
      ? dataSP(barbearia.assinatura_valido_ate)
      : hoje;
    const vencimento = fimDoPeriodo > hoje ? fimDoPeriodo : hoje;

    const assinatura = await chamar<{ id: string }>("/subscriptions", {
      method: "POST",
      body: {
        customer: clienteId,
        billingType: TIPO_COBRANCA[forma],
        value: plano.valor,
        nextDueDate: vencimento,
        cycle: "MONTHLY",
        description: `Naviu ${plano.nome}`,
        externalReference: `${PREFIXO_REFERENCIA}${barbearia.id}`,
      },
    });
    const p = await faturaAberta(chamar, assinatura.id);

    await admin.from("assinaturas").upsert({
      barbearia_id: barbearia.id,
      plano: plano.id,
      valor: plano.valor,
      forma,
      asaas_cliente_id: clienteId,
      asaas_assinatura_id: assinatura.id,
      fatura_url: p?.invoiceUrl ?? null,
      atualizado_em: new Date().toISOString(),
    });
    // O plano vale na hora; o status só vira "ativa" quando o Asaas confirmar o pagamento.
    await admin
      .from("barbearias")
      .update({
        plano: plano.id,
        limite_barbeiros: plano.limiteBarbeiros,
        ...(barbearia.assinatura_status === "cancelada" ? { assinatura_status: "atrasada" } : {}),
      })
      .eq("id", barbearia.id);

    return { error: null, faturaUrl: p?.invoiceUrl ?? null };
  });
}

export async function trocarPlano(formData: FormData): Promise<Resultado> {
  const plano = buscarPlano(String(formData.get("plano") ?? ""));
  if (!plano) return { error: "Escolha um plano." };

  return comAsaas(async () => {
    const { barbearia, admin, atual, chamar } = await contexto();
    if (!atual?.asaas_assinatura_id || barbearia.assinatura_status === "cancelada") {
      return { error: "Você ainda não assinou." };
    }
    if (atual.plano === plano.id) return { error: null };
    if (plano.limiteBarbeiros < (await contarBarbeirosAtivos(barbearia.id))) {
      return {
        error: `O plano ${plano.nome} permite ${plano.limiteBarbeiros} barbeiro(s) ativo(s). Desative os outros antes de trocar.`,
      };
    }

    await chamar(`/subscriptions/${encodeURIComponent(atual.asaas_assinatura_id)}`, {
      method: "PUT",
      body: {
        value: plano.valor,
        description: `Naviu ${plano.nome}`,
        updatePendingPayments: true,
      },
    });
    const p = await faturaAberta(chamar, atual.asaas_assinatura_id);
    await admin
      .from("assinaturas")
      .update({
        plano: plano.id,
        valor: plano.valor,
        fatura_url: p?.invoiceUrl ?? null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("barbearia_id", barbearia.id);
    await admin
      .from("barbearias")
      .update({ plano: plano.id, limite_barbeiros: plano.limiteBarbeiros })
      .eq("id", barbearia.id);
    return { error: null };
  });
}

export async function trocarForma(formData: FormData): Promise<Resultado> {
  const forma = lerForma(formData.get("forma"));

  return comAsaas(async () => {
    const { barbearia, admin, atual, chamar } = await contexto();
    if (!atual?.asaas_assinatura_id || barbearia.assinatura_status === "cancelada") {
      return { error: "Você ainda não assinou." };
    }
    await chamar(`/subscriptions/${encodeURIComponent(atual.asaas_assinatura_id)}`, {
      method: "PUT",
      body: { billingType: TIPO_COBRANCA[forma], updatePendingPayments: true },
    });
    const p = await faturaAberta(chamar, atual.asaas_assinatura_id);
    await admin
      .from("assinaturas")
      .update({
        forma,
        fatura_url: p?.invoiceUrl ?? null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("barbearia_id", barbearia.id);
    // Indo pro cartão, a pessoa precisa cadastrar o cartão na fatura.
    return { error: null, faturaUrl: forma === "cartao" ? (p?.invoiceUrl ?? null) : null };
  });
}

export async function pagarAgora(): Promise<Resultado> {
  return comAsaas(async () => {
    const { barbearia, admin, atual, chamar } = await contexto();
    if (!atual?.asaas_assinatura_id) return { error: "Você ainda não assinou." };
    const p = await faturaAberta(chamar, atual.asaas_assinatura_id);
    if (!p?.invoiceUrl) return { error: "Não há fatura em aberto." };
    await admin
      .from("assinaturas")
      .update({ fatura_url: p.invoiceUrl })
      .eq("barbearia_id", barbearia.id);
    return { error: null, faturaUrl: p.invoiceUrl };
  });
}

export async function cancelarAssinatura(): Promise<Resultado> {
  return comAsaas(async () => {
    const { barbearia, admin, atual, chamar } = await contexto();
    if (!atual?.asaas_assinatura_id || barbearia.assinatura_status === "cancelada") {
      return { error: "Você ainda não assinou." };
    }
    await chamar(`/subscriptions/${encodeURIComponent(atual.asaas_assinatura_id)}`, {
      method: "DELETE",
    });
    await admin
      .from("assinaturas")
      .update({ fatura_url: null, atualizado_em: new Date().toISOString() })
      .eq("barbearia_id", barbearia.id);
    // O acesso segue até o fim do período já pago (assinatura_valido_ate).
    await admin
      .from("barbearias")
      .update({ assinatura_status: "cancelada" })
      .eq("id", barbearia.id);
    return { error: null };
  });
}
