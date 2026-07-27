// O servidor (Vercel) roda em UTC, mas todo horário de barbearia é
// wall-clock de Brasília. Nunca usar `new Date(...)`, `setHours`,
// `getHours`, `toLocaleString` etc sem fuso explícito para isso — o
// resultado muda dependendo de onde o código está rodando (servidor em
// produção vs dev local), e esse tipo de bug só aparece em produção.
// Brasil não observa mais horário de verão desde 2019, então o offset é
// fixo o ano inteiro.
const OFFSET_BRASILIA = "-03:00";
export const FUSO_BRASILIA = "America/Sao_Paulo";

// Combina uma data (YYYY-MM-DD) e um horário (HH:MM) no fuso de Brasília
// num instante absoluto, independente do fuso do processo rodando o código.
export function horarioBrasilia(dataISO: string, horaMin: string): Date {
  return new Date(`${dataISO}T${horaMin}:00${OFFSET_BRASILIA}`);
}

// Dia da semana (0=domingo...6=sábado) de uma data "YYYY-MM-DD". O dia da
// semana de uma data-calendário não depende de fuso horário nenhum — usa
// UTC só para não deixar a interpretação sujeita ao fuso do processo.
export function diaSemanaDeData(dataISO: string): number {
  return new Date(`${dataISO}T00:00:00Z`).getUTCDay();
}

// "YYYY-MM-DD" de hoje no fuso de Brasília, independente de onde o
// código está rodando.
export function hojeISOBrasilia(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASILIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const obter = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${obter("year")}-${obter("month")}-${obter("day")}`;
}

export function formatarHoraBrasilia(data: Date): string {
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_BRASILIA,
  });
}

export function formatarDataBrasilia(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: FUSO_BRASILIA });
}
