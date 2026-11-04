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
// de [hora_inicio, hora_fim), pulando a pausa (ex.: almoço) se houver, e
// também logo que cada atendimento termina (encaixe pelo tempo do serviço).
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

    // Candidatos: a grade normal (a cada `passo`) mais o minuto em que cada
    // atendimento ou pausa termina. Assim, se um corte de 10 min começa às
    // 15:00, às 15:10 o barbeiro já aparece livre, mesmo fora da grade.
    const candidatos = new Set<number>();
    for (let t = cursorInicial.getTime(); t < fimJanela.getTime(); t += passo * 60_000) {
      candidatos.add(t);
    }
    for (const fim of [...params.ocupados.map((o) => o.fim), ...(pausa ? [pausa.fim] : [])]) {
      const t = fim.getTime();
      if (t > cursorInicial.getTime() && t < fimJanela.getTime()) candidatos.add(t);
    }

    for (const t of candidatos) {
      const cursor = new Date(t);
      const fimSlot = new Date(t + duracaoMs);
      if (fimSlot > fimJanela) continue;
      if (livre(cursor, fimSlot, pausa)) slots.push(cursor);
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}
