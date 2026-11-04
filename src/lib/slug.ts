const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

export function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Nomes que já são páginas do próprio Naviu (naviu.app.br/admin etc.) e
// por isso não podem virar o link de uma barbearia.
const RESERVADOS = new Set([
  "admin", "api", "b", "cadastro", "cancelar", "confirmar", "login", "precos",
  "redefinir-senha", "marca", "icon", "favicon", "robots", "sitemap", "naviu",
  "ajuda", "suporte", "termos", "privacidade", "blog", "app", "www",
]);

// Confere o link que a barbearia escolheu. Devolve a mensagem de erro, ou
// null se estiver tudo certo.
export function problemaNoSlug(slug: string): string | null {
  if (slug.length < 3) return "O link precisa ter pelo menos 3 letras.";
  if (slug.length > 40) return "O link pode ter no máximo 40 caracteres.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return "Use só letras sem acento, números e hífen (ex.: barbearia-do-ze).";
  }
  if (RESERVADOS.has(slug)) return "Esse link é reservado. Escolha outro.";
  return null;
}

export async function gerarSlugUnico(
  nome: string,
  slugJaExiste: (slug: string) => Promise<boolean>,
): Promise<string> {
  const limpo = slugificar(nome);
  const base = limpo.length >= 3 && !RESERVADOS.has(limpo) ? limpo : `barbearia-${limpo}`.replace(/-$/, "");
  let slug = base;
  let sufixo = 2;

  while (await slugJaExiste(slug)) {
    slug = `${base}-${sufixo}`;
    sufixo += 1;
  }

  return slug;
}
