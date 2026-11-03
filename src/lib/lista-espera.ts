import type { SupabaseClient } from "@supabase/supabase-js";
import { noPeriodo, type Periodo } from "./agente/datas";
import { enviarEmailVagaAberta } from "./email";
import { dataISOBrasilia } from "./timezone";

// Quantas pessoas da lista são avisadas por vaga. Mais de uma, porque nem
// todo mundo lê o e-mail a tempo; quem marcar primeiro leva (a trava do
// banco impede dois no mesmo horário).
const AVISOS_POR_VAGA = 5;

/**
 * Chamado quando um agendamento é cancelado: avisa por e-mail quem está na
 * lista de espera daquele dia (mesmo barbeiro ou "qualquer um", e período
 * compatível). Cada pessoa é avisada uma vez só. Precisa da chave de serviço.
 */
export async function avisarListaEspera(supabase: SupabaseClient, agendamentoId: string): Promise<number> {
  const { data: a } = await supabase
    .from("agendamentos")
    .select("data_hora, barbeiro_id, barbearias(id, nome, slug)")
    .eq("id", agendamentoId)
    .maybeSingle();
  if (!a) return 0;

  const dataHora = new Date(a.data_hora);
  if (dataHora <= new Date()) return 0;
  const barbearia = a.barbearias as unknown as { id: string; nome: string; slug: string } | null;
  if (!barbearia) return 0;

  const { data: fila } = await supabase
    .from("lista_espera")
    .select("id, nome, email, periodo, barbeiro_id, servicos(nome)")
    .eq("barbearia_id", barbearia.id)
    .eq("data", dataISOBrasilia(dataHora))
    .is("avisado_em", null)
    .order("criado_em");

  const avisar = (fila ?? [])
    .filter((f) => !f.barbeiro_id || f.barbeiro_id === a.barbeiro_id)
    .filter((f) => !f.periodo || noPeriodo(dataHora, f.periodo as Periodo))
    .slice(0, AVISOS_POR_VAGA);
  if (avisar.length === 0) return 0;

  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://naviu.app.br"}/b/${barbearia.slug}`;
  for (const f of avisar) {
    const servico = f.servicos as unknown as { nome: string } | null;
    await enviarEmailVagaAberta(f.email, {
      clienteNome: f.nome,
      barbeariaNome: barbearia.nome,
      servicoNome: servico?.nome ?? "seu serviço",
      dataHora,
      link,
    });
  }

  await supabase
    .from("lista_espera")
    .update({ avisado_em: new Date().toISOString() })
    .in(
      "id",
      avisar.map((f) => f.id),
    );
  return avisar.length;
}
