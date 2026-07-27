export type Intervalo = { inicio: Date; fim: Date };

// Gera os horários de início possíveis para um serviço de `duracaoServicoMin`,
// dado os intervalos de trabalho do dia e os intervalos já ocupados
// (bloqueios + agendamentos existentes, com a duração do serviço de cada um).
export function gerarSlotsDisponiveis(params: {
  data: Date; // qualquer horário do dia desejado; só a data (ano/mês/dia) é usada
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
    const [hIni, mIni] = janela.hora_inicio.split(":").map(Number);
    const [hFim, mFim] = janela.hora_fim.split(":").map(Number);

    const cursorInicial = new Date(params.data);
    cursorInicial.setHours(hIni, mIni, 0, 0);
    const fimJanela = new Date(params.data);
    fimJanela.setHours(hFim, mFim, 0, 0);

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
