// Aniversário do cliente: só dia e mês ("25/12"). O ano não importa para
// mandar parabéns e muita gente não gosta de dizer a idade.

const DIAS_NO_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export type Aniversario = { dia: number; mes: number };

// Aceita "25/12", "25-12", "25.12" ou "2512". Devolve null se não for uma
// data que existe (29/02 vale).
export function lerAniversario(texto: string): Aniversario | null {
  const m = texto.trim().match(/^(\d{1,2})\s*[/.-]?\s*(\d{1,2})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > DIAS_NO_MES[mes - 1]) return null;
  return { dia, mes };
}

export function formatarAniversario(dia: number, mes: number): string {
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}
