"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { avisarListaEspera } from "@/lib/lista-espera";
import type { FormaPagamento } from "@/lib/types";

const FORMAS: FormaPagamento[] = ["dinheiro", "cartao", "pix"];

// Agenda, início, clientes e financeiro mostram os mesmos horários: qualquer
// mudança atualiza o painel inteiro.
function atualizarPainel() {
  revalidatePath("/admin", "layout");
}

// Fecha o atendimento: quanto foi cobrado e como o cliente pagou. É isso que
// entra no faturamento e na comissão do barbeiro.
export async function concluirAgendamento(
  agendamentoId: string,
  forma: FormaPagamento,
  valor: number,
) {
  if (!FORMAS.includes(forma)) return { error: "Escolha como o cliente pagou." };
  if (!Number.isFinite(valor) || valor < 0 || valor > 100_000) return { error: "Valor inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("agendamentos")
    .update({
      status: "concluido",
      forma_pagamento: forma,
      valor_cobrado: Math.round(valor * 100) / 100,
      concluido_em: new Date().toISOString(),
    })
    .eq("id", agendamentoId);
  if (error) return { error: "Não foi possível salvar. Tente de novo." };
  atualizarPainel();
  return { error: null };
}

export async function cancelarAgendamento(agendamentoId: string) {
  const supabase = await createClient();
  // O RLS só deixa atualizar agendamentos da própria barbearia; se nada
  // voltou, não era dela e ninguém é avisado.
  const { data } = await supabase
    .from("agendamentos")
    .update({
      status: "cancelado",
      cancelado_em: new Date().toISOString(),
      cancelado_por: "barbearia",
    })
    .eq("id", agendamentoId)
    .select("id");
  if (data?.length) await avisarListaEspera(createServiceRoleClient(), agendamentoId);
  atualizarPainel();
  return { error: null };
}

export async function marcarFalta(agendamentoId: string) {
  const supabase = await createClient();
  await supabase
    .from("agendamentos")
    .update({ status: "faltou" })
    .eq("id", agendamentoId)
    .lte("data_hora", new Date().toISOString());
  atualizarPainel();
  return { error: null };
}

// Desfaz um "concluído" ou "faltou" marcado sem querer.
export async function reabrirAgendamento(agendamentoId: string) {
  const supabase = await createClient();
  await supabase
    .from("agendamentos")
    .update({ status: "confirmado", valor_cobrado: null, concluido_em: null, forma_pagamento: null })
    .eq("id", agendamentoId)
    .in("status", ["concluido", "faltou"]);
  atualizarPainel();
  return { error: null };
}

export async function sairDaListaDeEspera(id: string) {
  const supabase = await createClient();
  await supabase.from("lista_espera").delete().eq("id", id);
  atualizarPainel();
}
