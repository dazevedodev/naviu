"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Rota pública (sem sessão): o token do agendamento é a própria autorização.
export async function cancelarViaToken(token: string) {
  const supabase = createServiceRoleClient();

  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select("id, status")
    .eq("cancelamento_token", token)
    .maybeSingle();

  if (!agendamento) {
    return { error: "Agendamento não encontrado." };
  }
  if (agendamento.status === "cancelado" || agendamento.status === "concluido") {
    return { error: "Esse agendamento já não pode mais ser cancelado." };
  }

  const { error } = await supabase
    .from("agendamentos")
    .update({ status: "cancelado" })
    .eq("id", agendamento.id);

  if (error) {
    return { error: "Não foi possível cancelar. Tente novamente." };
  }

  revalidatePath(`/cancelar/${token}`);
  return { error: null };
}
