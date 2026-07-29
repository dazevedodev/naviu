import { horarioBrasilia } from "./timezone";

export type Intervalo = { inicio: Date; fim: Date };

export type JanelaTrabalho = {
  dia_semana: number;
  modo: "automatico" | "manual";
  hora_inicio: string | null;
  hora_fim: string | null;
  intervalo_min: number;
  pausa_inicio: string | null;
  pausa_fim: string | null;
  horarios_manuais: string[];
};

// Gera os horários de início possíveis para um serviço de `duracaoServicoMin`,
// dado os horários de trabalho do dia e os intervalos já ocupados (bloqueios
// + agendamentos existentes, com a duração do serviço de cada um).
//
// Modo "automático": os horários são gerados a cada `intervalo_min` dentro
// de [hora_inicio, hora_fim), pulando a pausa (ex.: almoço) se houver.
// Modo "manual": os horários são exatamente os listados em
// `horarios_manuais`, sem gerar nada — a duração do serviço ainda define
// até quando cada um ocupa, mas não há checagem contra um "fim do dia".
export function gerarSlotsDisponiveis(params: {
  dataISO: string; // "YYYY-MM-DD", dia desejado no fuso de Brasília
  diaSemana: number;
  duracaoServicoMin: number;
  horariosTrabalho: JanelaTrabalho[];
  ocupados: Intervalo[];
  agora?: Date;
}): Date[] {
  const janelas = params.horariosTrabalho.filter(
    (h) => h.dia_semana === params.diaSemana,
  );
  const slots: Date[] = [];
  const duracaoMs = params.duracaoServicoMin * 60_000;

  function livre(cursor: Date, fimSlot: Date, pausa: Intervalo | null): boolean {
    if (params.agora && cursor < params.agora) return false;
    if (pausa && cursor < pausa.fim && fimSlot > pausa.inicio) return false;
    return !params.ocupados.some((o) => cursor < o.fim && fimSlot > o.inicio);
  }

  for (const janela of janelas) {
    if (janela.modo === "manual") {
      for (const hora of janela.horarios_manuais) {
        const cursor = horarioBrasilia(params.dataISO, hora);
        const fimSlot = new Date(cursor.getTime() + duracaoMs);
        if (livre(cursor, fimSlot, null)) slots.push(cursor);
      }
      continue;
    }

    if (!janela.hora_inicio || !janela.hora_fim) continue;

    const passo = janela.intervalo_min > 0 ? janela.intervalo_min : 15;
    const cursorInicial = horarioBrasilia(params.dataISO, janela.hora_inicio.slice(0, 5));
    const fimJanela = horarioBrasilia(params.dataISO, janela.hora_fim.slice(0, 5));
    const pausa: Intervalo | null =
      janela.pausa_inicio && janela.pausa_fim
        ? {
            inicio: horarioBrasilia(params.dataISO, janela.pausa_inicio.slice(0, 5)),
            fim: horarioBrasilia(params.dataISO, janela.pausa_fim.slice(0, 5)),
          }
        : null;

    for (
      let cursor = cursorInicial;
      cursor.getTime() + duracaoMs <= fimJanela.getTime();
      cursor = new Date(cursor.getTime() + passo * 60_000)
    ) {
      const fimSlot = new Date(cursor.getTime() + duracaoMs);
      if (livre(cursor, fimSlot, pausa)) slots.push(new Date(cursor));
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}
