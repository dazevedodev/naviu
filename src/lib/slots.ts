import { horarioBrasilia } from "./timezone";

export type Intervalo = { inicio: Date; fim: Date };

// Gera os horários de início possíveis para um serviço de `duracaoServicoMin`,
// dado os intervalos de trabalho do dia e os intervalos já ocupados
// (bloqueios + agendamentos existentes, com a duração do serviço de cada um).
export function gerarSlotsDisponiveis(params: {
  dataISO: string; // "YYYY-MM-DD", dia desejado no fuso de Brasília
  diaSemana: number;
  duracaoServicoMin: number;
  horariosTrabalho: { dia_semana: number; hora_inicio: string; hora_fim: string }[];
  ocupados: Intervalo[];
  passoMin?: number;
  agora?: Date;
}): Date[] {
  const passo = params.passoMin ?? 15;
  const janelas = params.horariosTrabalho.filter(
    (h) => h.dia_semana === params.diaSemana,
  );
  const slots: Date[] = [];

  for (const janela of janelas) {
    const cursorInicial = horarioBrasilia(params.dataISO, janela.hora_inicio.slice(0, 5));
    const fimJanela = horarioBrasilia(params.dataISO, janela.hora_fim.slice(0, 5));

    for (
      let cursor = cursorInicial;
      cursor.getTime() + params.duracaoServicoMin * 60_000 <= fimJanela.getTime();
      cursor = new Date(cursor.getTime() + passo * 60_000)
    ) {
      if (params.agora && cursor < params.agora) continue;

      const fimSlot = new Date(cursor.getTime() + params.duracaoServicoMin * 60_000);
      const conflita = params.ocupados.some((o) => cursor < o.fim && fimSlot > o.inicio);
      if (!conflita) slots.push(new Date(cursor));
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}
