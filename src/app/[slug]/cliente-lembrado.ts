// Quem já agendou neste aparelho: nome, WhatsApp e e-mail ficam guardados no
// próprio navegador (localStorage), nunca no servidor. Serve para preencher o
// formulário e para a Navi cumprimentar o cliente pelo nome.

const CHAVE = "naviu:cliente";

export type ClienteLembrado = { nome: string; telefone: string; email?: string };

export function clienteLembrado(): ClienteLembrado | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    return c && typeof c.nome === "string" && typeof c.telefone === "string" ? c : null;
  } catch {
    return null;
  }
}

export function lembrarCliente(c: ClienteLembrado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(c));
  } catch {
    // Navegador sem armazenamento (aba anônima etc.): só não lembra.
  }
}

export function esquecerCliente() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {}
}
