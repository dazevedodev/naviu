// Quem parou de vir à barbearia. Dois casos que pedem conversas diferentes:
// - uma_vez: veio só uma vez e não voltou (ainda não virou cliente).
// - fiel: já veio várias vezes, mas está sumido (pode estar indo em outra).
//
// Só entra quem não tem horário marcado e não foi chamado há pouco.

export const DIAS_SUMIDO = 40;
// Depois de chamar, a pessoa some da lista por este tempo.
export const DIAS_DESCANSO_CHAMADO = 30;

const DIA_MS = 24 * 60 * 60 * 1000;

export type Sumido = { tipo: "uma_vez" | "fiel"; dias: number };

export function situacaoSumido(
  c: { visitas: number; ultima_visita: string | null; proximo_horario: string | null; chamado_em?: string | null },
  agora: Date,
): Sumido | null {
  if (!c.ultima_visita || c.visitas < 1 || c.proximo_horario) return null;
  const dias = Math.floor((agora.getTime() - new Date(c.ultima_visita).getTime()) / DIA_MS);
  if (dias < DIAS_SUMIDO) return null;
  if (c.chamado_em && agora.getTime() - new Date(c.chamado_em).getTime() < DIAS_DESCANSO_CHAMADO * DIA_MS) {
    return null;
  }
  return { tipo: c.visitas === 1 ? "uma_vez" : "fiel", dias };
}

// Data limite para a consulta no banco: última visita antes disto.
export function limiteSumido(agora: Date): string {
  return new Date(agora.getTime() - DIAS_SUMIDO * DIA_MS).toISOString();
}

export function mensagemVolta(s: Sumido, nome: string, barbearia: string, slug: string): string {
  const primeiro = nome.trim().split(" ")[0];
  const link = `naviu.app.br/${slug}`;
  return s.tipo === "uma_vez"
    ? `Oi, ${primeiro}! Tudo bem? Aqui é da ${barbearia}. Faz um tempinho que você passou por aqui, que tal marcar o próximo corte? É só escolher o horário: ${link}`
    : `Oi, ${primeiro}! Sentimos sua falta aqui na ${barbearia}, já são ${s.dias} dias desde o último corte. Bora marcar? ${link}`;
}
