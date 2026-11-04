"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { cancelarPeloCliente } from "@/lib/cancelar";

// Rota pública (sem sessão): o token do agendamento é a própria autorização.
export async function cancelarViaToken(token: string) {
  const supabase = createServiceRoleClient();

  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select("id")
    .eq("cancelamento_token", token)
    .maybeSingle();

  if (!agendamento) {
    return { error: "Agendamento não encontrado." };
  }

  const resultado = await cancelarPeloCliente(supabase, agendamento.id);
  if (resultado.error) return resultado;

  revalidatePath(`/cancelar/${token}`);
  return { error: null };
}
