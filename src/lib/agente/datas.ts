import { FUSO_BRASILIA } from "../timezone";

export type Periodo = "manha" | "tarde" | "noite" | "qualquer";

export const DIAS_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

// Quantos dias o agente pode consultar de uma vez e até quando no futuro.
export const MAX_DIAS_POR_CONSULTA = 7;
export const MAX_DIAS_A_FRENTE = 60;

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function dataISOValida(data: string): boolean {
  if (!DATA_ISO.test(data)) return false;
  const d = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === data;
}

export function somarDias(dataISO: string, dias: number): string {
  const d = new Date(`${dataISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Datas de `inicio` a `fim` (inclusive), cortadas para não voltar antes de
// hoje, não passar de MAX_DIAS_A_FRENTE e não somar mais que
// MAX_DIAS_POR_CONSULTA dias.
export function intervaloDeDatas(inicio: string, fim: string, hoje: string): string[] {
  const limite = somarDias(hoje, MAX_DIAS_A_FRENTE);
  let atual = inicio < hoje ? hoje : inicio;
  const ultimo = fim > limite ? limite : fim;
  const datas: string[] = [];
  while (atual <= ultimo && datas.length < MAX_DIAS_POR_CONSULTA) {
    datas.push(atual);
    atual = somarDias(atual, 1);
  }
  return datas;
}

// Hora do dia (0-23) de um instante, no fuso de Brasília.
export function horaBrasilia(data: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSO_BRASILIA,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(data),
  );
}

// Manhã: antes do meio-dia. Tarde: 12h às 18h. Noite: das 18h em diante.
export function noPeriodo(data: Date, periodo: Periodo): boolean {
  const hora = horaBrasilia(data);
  if (periodo === "manha") return hora < 12;
  if (periodo === "tarde") return hora >= 12 && hora < 18;
  if (periodo === "noite") return hora >= 18;
  return true;
}
