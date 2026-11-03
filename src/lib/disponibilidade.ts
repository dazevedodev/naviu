import type { SupabaseClient } from "@supabase/supabase-js";
import { gerarSlotsDisponiveis } from "./slots";
import { diaSemanaDeData, horarioBrasilia } from "./timezone";

// Horários livres de um barbeiro num dia, para um serviço. Usado pela página
// de agendamento (/api/disponibilidade) e pelo agente de IA, para os dois
// enxergarem exatamente a mesma agenda.
//
// Precisa de um client service_role: `agendamentos` só é legível via RLS
// pelo dono da barbearia, e aqui qualquer visitante calcula a agenda.
export async function horariosLivres(
  supabase: SupabaseClient,
  params: { barbeiroId: string; duracaoServicoMin: number; dataISO: string; agora?: Date },
): Promise<Date[]> {
  const { barbeiroId, duracaoServicoMin, dataISO } = params;
  const inicioDia = horarioBrasilia(dataISO, "00:00");
  const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60_000);

  const [{ data: horarios }, { data: bloqueios }, { data: agendamentos }] = await Promise.all([
    supabase
      .from("horarios_trabalho")
      .select(
        "dia_semana, modo, hora_inicio, hora_fim, intervalo_min, pausa_inicio, pausa_fim, horarios_manuais",
      )
      .eq("barbeiro_id", barbeiroId),
    supabase
      .from("bloqueios")
      .select("hora_inicio, hora_fim")
      .eq("barbeiro_id", barbeiroId)
      .eq("data", dataISO),
    supabase
      .from("agendamentos")
      .select("data_hora, servicos(duracao_min)")
      .eq("barbeiro_id", barbeiroId)
      .gte("data_hora", inicioDia.toISOString())
      .lt("data_hora", fimDia.toISOString())
      .neq("status", "cancelado"),
  ]);

  const ocupados = [
    ...(bloqueios ?? []).map((b) => {
      if (b.hora_inicio && b.hora_fim) {
        return {
          inicio: horarioBrasilia(dataISO, b.hora_inicio.slice(0, 5)),
          fim: horarioBrasilia(dataISO, b.hora_fim.slice(0, 5)),
        };
      }
      return { inicio: inicioDia, fim: fimDia }; // dia inteiro
    }),
    ...(agendamentos ?? []).map((a) => {
      const inicio = new Date(a.data_hora);
      const duracao = (a.servicos as unknown as { duracao_min: number } | null)?.duracao_min ?? 30;
      return { inicio, fim: new Date(inicio.getTime() + duracao * 60_000) };
    }),
  ];

  return gerarSlotsDisponiveis({
    dataISO,
    diaSemana: diaSemanaDeData(dataISO),
    duracaoServicoMin,
    horariosTrabalho: horarios ?? [],
    ocupados,
    agora: params.agora ?? new Date(),
  });
}
