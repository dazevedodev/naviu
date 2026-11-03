"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { avisarListaEspera } from "@/lib/lista-espera";
import type { FormaPagamento } from "@/lib/types";

export async function definirFormaPagamento(agendamentoId: string, forma: FormaPagamento) {
  const supabase = await createClient();
  await supabase
    .from("agendamentos")
    .update({ forma_pagamento: forma })
    .eq("id", agendamentoId);
  revalidatePath("/admin");
}

export async function concluirAgendamento(agendamentoId: string) {
  const supabase = await createClient();
  await supabase
    .from("agendamentos")
    .update({ status: "concluido" })
    .eq("id", agendamentoId);
  revalidatePath("/admin");
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
  revalidatePath("/admin");
}

export async function marcarFalta(agendamentoId: string) {
  const supabase = await createClient();
  await supabase
    .from("agendamentos")
    .update({ status: "faltou" })
    .eq("id", agendamentoId)
    .lte("data_hora", new Date().toISOString());
  revalidatePath("/admin");
}

export async function sairDaListaDeEspera(id: string) {
  const supabase = await createClient();
  await supabase.from("lista_espera").delete().eq("id", id);
  revalidatePath("/admin");
}
