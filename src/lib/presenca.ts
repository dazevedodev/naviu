// Regras de presença (faltas, cancelamentos em cima da hora e confirmação no
// dia anterior) — puras, pra serem testadas sem banco.

const HORA_MS = 60 * 60_000;

// Cancelar com menos que isso de antecedência conta como "em cima da hora":
// o horário dificilmente é preenchido por outro cliente.
export const HORAS_CANCELAMENTO_EM_CIMA = 3;

// A confirmação sai quando falta até 24h para o horário. Abaixo de 2h quem
// cuida é o lembrete de 1h antes, então não manda as duas coisas juntas.
export const HORAS_CONFIRMACAO = 24;
const HORAS_MINIMAS_CONFIRMACAO = 2;

export function canceladoEmCimaDaHora(dataHora: Date, canceladoEm: Date): boolean {
  return dataHora.getTime() - canceladoEm.getTime() < HORAS_CANCELAMENTO_EM_CIMA * HORA_MS;
}

/**
 * Se já é hora de pedir a confirmação de presença. Só para horários marcados
 * com pelo menos um dia de antecedência: quem marcou hoje para amanhã acabou
 * de decidir e não precisa confirmar de novo.
 */
export function precisaPedirConfirmacao(
  a: { data_hora: string; criado_em: string },
  agora = new Date(),
): boolean {
  const inicio = new Date(a.data_hora).getTime();
  const falta = inicio - agora.getTime();
  const antecedencia = inicio - new Date(a.criado_em).getTime();
  return (
    falta > HORAS_MINIMAS_CONFIRMACAO * HORA_MS &&
    falta <= HORAS_CONFIRMACAO * HORA_MS &&
    antecedencia >= HORAS_CONFIRMACAO * HORA_MS
  );
}

export type ItemHistorico = {
  status: string;
  data_hora: string;
  cancelado_em: string | null;
  cancelado_por: string | null;
};

export type ResumoHistorico = {
  atendimentos: number;
  faltas: number;
  cancelamentosEmCima: number;
};

export function resumirHistorico(itens: ItemHistorico[]): ResumoHistorico {
  const resumo: ResumoHistorico = { atendimentos: 0, faltas: 0, cancelamentosEmCima: 0 };
  for (const i of itens) {
    if (i.status === "concluido") resumo.atendimentos++;
    else if (i.status === "faltou") resumo.faltas++;
    else if (
      i.status === "cancelado" &&
      i.cancelado_por === "cliente" &&
      i.cancelado_em &&
      canceladoEmCimaDaHora(new Date(i.data_hora), new Date(i.cancelado_em))
    ) {
      resumo.cancelamentosEmCima++;
    }
  }
  return resumo;
}

/** Aviso curto para o painel, ou null se o cliente não tem problema no histórico. */
export function alertaDoHistorico(r: ResumoHistorico): string | null {
  const partes: string[] = [];
  if (r.faltas) partes.push(`${r.faltas} ${r.faltas === 1 ? "falta" : "faltas"}`);
  if (r.cancelamentosEmCima) {
    partes.push(
      `${r.cancelamentosEmCima} ${r.cancelamentosEmCima === 1 ? "cancelamento" : "cancelamentos"} em cima da hora`,
    );
  }
  return partes.length ? partes.join(" · ") : null;
}
