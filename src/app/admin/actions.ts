"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  await supabase
    .from("agendamentos")
    .update({ status: "cancelado" })
    .eq("id", agendamentoId);
  revalidatePath("/admin");
}
