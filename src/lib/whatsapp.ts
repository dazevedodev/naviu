export function formatarTelefoneWhatsApp(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  return `55${digitos}`;
}

export function preencherTemplateMensagem(
  template: string,
  variaveis: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, chave) => variaveis[chave] ?? match);
}

export function montarLinkWhatsApp(telefone: string, mensagem: string): string {
  const numero = formatarTelefoneWhatsApp(telefone);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
