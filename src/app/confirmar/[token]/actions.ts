"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Rota pública (sem sessão): o token do agendamento é a própria autorização.
export async function confirmarPresencaViaToken(token: string) {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("agendamentos")
    .update({ presenca_confirmada_em: new Date().toISOString() })
    .eq("cancelamento_token", token)
    .not("status", "in", "(cancelado,concluido,faltou)")
    .gt("data_hora", new Date().toISOString())
    .select("id");

  if (error || !data?.length) {
    return { error: "Esse agendamento não pode mais ser confirmado." };
  }

  revalidatePath(`/confirmar/${token}`);
  return { error: null };
}
