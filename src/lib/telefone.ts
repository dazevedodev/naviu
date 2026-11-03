// Chave de um cliente dentro da barbearia: só os dígitos do WhatsApp, sem o
// 55 do Brasil. "(11) 98888-7777", "+55 11 98888-7777" e "11988887777" viram
// a mesma pessoa. Mesma regra da migração 0012.
export function normalizarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    return digitos.slice(2);
  }
  return digitos;
}

// Celular ou fixo brasileiro com DDD (10 ou 11 dígitos depois de normalizado).
export function telefoneValido(telefone: string): boolean {
  const n = normalizarTelefone(telefone);
  return n.length === 10 || n.length === 11;
}
