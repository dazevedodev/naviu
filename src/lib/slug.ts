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

export async function gerarSlugUnico(
  nome: string,
  slugJaExiste: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugificar(nome) || "barbearia";
  let slug = base;
  let sufixo = 2;

  while (await slugJaExiste(slug)) {
    slug = `${base}-${sufixo}`;
    sufixo += 1;
  }

  return slug;
}
