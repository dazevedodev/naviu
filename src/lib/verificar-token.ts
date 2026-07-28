import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// Valida um token estático na querystring (`?token=...`) contra uma env var,
// em tempo constante — usado pelo webhook da Kiwify e pelo endpoint de cron
// dos lembretes, ambos chamados por serviços externos sem sessão.
export function tokenDaQueryValido(request: NextRequest, envVar: string): boolean {
  const esperado = process.env[envVar];
  const recebido = request.nextUrl.searchParams.get("token");
  if (!esperado || !recebido) return false;

  const bufEsperado = Buffer.from(esperado);
  const bufRecebido = Buffer.from(recebido);
  if (bufEsperado.length !== bufRecebido.length) return false;
  return timingSafeEqual(bufEsperado, bufRecebido);
}
