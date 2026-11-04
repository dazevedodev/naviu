import type { SupabaseClient } from "@supabase/supabase-js";
import { avisarListaEspera } from "./lista-espera";

// Status em que o horário ainda está de pé e o cliente pode desmarcar.
export const STATUS_ATIVOS = ["pendente", "confirmado"];

// O cliente desmarca o próprio horário (pelo link do e-mail ou com a Navi).
// Quem chama já conferiu que o agendamento é dele. Libera o horário e avisa
// a lista de espera do dia.
export async function cancelarPeloCliente(
  supabase: SupabaseClient,
  agendamentoId: string,
): Promise<{ error: string | null }> {
  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select("id, status")
    .eq("id", agendamentoId)
    .maybeSingle();

  if (!agendamento) return { error: "Agendamento não encontrado." };
  if (!STATUS_ATIVOS.includes(agendamento.status)) {
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

  if (error) return { error: "Não foi possível cancelar. Tente novamente." };

  await avisarListaEspera(supabase, agendamento.id);
  return { error: null };
}
