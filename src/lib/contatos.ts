// Redes da barbearia: guarda só o nome de usuário, venha como vier
// ("@barbeariadoze", "instagram.com/barbeariadoze", link completo...).
export function lerUsuarioRede(texto: string): string | null {
  const limpo = texto
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?(instagram\.com|tiktok\.com)\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim();
  return /^[A-Za-z0-9._]{1,40}$/.test(limpo) ? limpo : null;
}

export function linkInstagram(usuario: string) {
  return `https://instagram.com/${usuario}`;
}

export function linkTiktok(usuario: string) {
  return `https://tiktok.com/@${usuario}`;
}
