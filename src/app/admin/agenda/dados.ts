import type { SupabaseClient } from "@supabase/supabase-js";
import { alertaDoHistorico, resumirHistorico, type ItemHistorico } from "@/lib/presenca";
import { horarioBrasilia } from "@/lib/timezone";
import type { FormaPagamento } from "@/lib/types";

// Um horário da agenda, já no formato que as telas do painel usam.
export type ItemAgenda = {
  id: string;
  inicio: string; // ISO
  duracao: number; // minutos
  status: string;
  barbeiroId: string;
  cliente: { id: string; nome: string; telefone: string };
  servico: { nome: string; preco: number };
  formaPagamento: FormaPagamento | null;
  valorCobrado: number | null;
  presencaConfirmada: boolean;
  alerta: string | null;
};

// Soma dias a uma data-calendário "YYYY-MM-DD".
export function somarDias(dataISO: string, dias: number): string {
  const d = new Date(`${dataISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Segunda-feira da semana de uma data.
export function inicioDaSemana(dataISO: string): string {
  const dia = new Date(`${dataISO}T00:00:00Z`).getUTCDay();
  return somarDias(dataISO, dia === 0 ? -6 : 1 - dia);
}

export function dataValida(texto: string | undefined): texto is string {
  return Boolean(texto && /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(Date.parse(texto)));
}

// Horários de [primeiroDia, primeiroDia + dias) da barbearia, com o alerta de
// histórico de cada cliente (faltas, cancelamentos em cima da hora).
export async function carregarAgenda(
  supabase: SupabaseClient,
  barbeariaId: string,
  primeiroDia: string,
  dias: number,
): Promise<ItemAgenda[]> {
  const inicio = horarioBrasilia(primeiroDia, "00:00").toISOString();
  const fim = horarioBrasilia(somarDias(primeiroDia, dias), "00:00").toISOString();

  const { data } = await supabase
    .from("agendamentos")
    .select(
      "id, data_hora, status, barbeiro_id, cliente_id, forma_pagamento, valor_cobrado, presenca_confirmada_em, servicos(nome, preco, duracao_min), clientes(id, nome, telefone_whatsapp)",
    )
    .eq("barbearia_id", barbeariaId)
    .gte("data_hora", inicio)
    .lt("data_hora", fim)
    .order("data_hora");

  const linhas = data ?? [];
  const clienteIds = [...new Set(linhas.map((a) => a.cliente_id).filter(Boolean))];
  const { data: historico } = clienteIds.length
    ? await supabase
        .from("agendamentos")
        .select("cliente_id, status, data_hora, cancelado_em, cancelado_por")
        .eq("barbearia_id", barbeariaId)
        .in("cliente_id", clienteIds)
    : { data: [] as (ItemHistorico & { cliente_id: string })[] };

  const alertas = new Map(
    clienteIds.map((id) => [
      id,
      alertaDoHistorico(resumirHistorico((historico ?? []).filter((h) => h.cliente_id === id))),
    ]),
  );

  return linhas.map((a) => {
    const servico = a.servicos as unknown as { nome: string; preco: number; duracao_min: number } | null;
    const cliente = a.clientes as unknown as { id: string; nome: string; telefone_whatsapp: string } | null;
    return {
      id: a.id,
      inicio: a.data_hora,
      duracao: servico?.duracao_min ?? 30,
      status: a.status,
      barbeiroId: a.barbeiro_id,
      cliente: {
        id: cliente?.id ?? a.cliente_id,
        nome: cliente?.nome ?? "Cliente",
        telefone: cliente?.telefone_whatsapp ?? "",
      },
      servico: { nome: servico?.nome ?? "Serviço", preco: Number(servico?.preco ?? 0) },
      formaPagamento: a.forma_pagamento as FormaPagamento | null,
      valorCobrado: a.valor_cobrado === null ? null : Number(a.valor_cobrado),
      presencaConfirmada: Boolean(a.presenca_confirmada_em),
      alerta: alertas.get(a.cliente_id) ?? null,
    };
  });
}
