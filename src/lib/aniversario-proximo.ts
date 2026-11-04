// Em quantos dias é o próximo aniversário (0 = hoje), a partir de uma data
// "YYYY-MM-DD". 29/02 em ano que não é bissexto conta como 28/02.
export function diasAteAniversario(hojeISO: string, dia: number, mes: number): number {
  const hoje = new Date(`${hojeISO}T00:00:00Z`);
  const ano = hoje.getUTCFullYear();
  const naData = (a: number) => {
    const bissexto = (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
    const d = mes === 2 && dia === 29 && !bissexto ? 28 : dia;
    return new Date(Date.UTC(a, mes - 1, d));
  };
  let proximo = naData(ano);
  if (proximo < hoje) proximo = naData(ano + 1);
  return Math.round((proximo.getTime() - hoje.getTime()) / 86_400_000);
}
