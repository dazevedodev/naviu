"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { avisarListaEspera } from "@/lib/lista-espera";

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
  if (["cancelado", "concluido", "faltou"].includes(agendamento.status)) {
    return { error: "Esse agendamento já não pode mais ser cancelado." };
  }

  const { error } = await supabase
    .from("agendamentos")
    .update({
      status: "cancelado",
      cancelado_em: new Date().toISOString(),
      cancelado_por: "cliente",
    })
    .eq("id", agendamento.id);

  if (error) {
    return { error: "Não foi possível cancelar. Tente novamente." };
  }

  await avisarListaEspera(supabase, agendamento.id);

  revalidatePath(`/cancelar/${token}`);
  return { error: null };
}
