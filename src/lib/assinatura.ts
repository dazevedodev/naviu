import type { Barbearia } from "@/lib/types";

// Regras de acesso pela assinatura — puras, pra serem testadas sem banco.

// Depois que vence uma mensalidade, a barbearia ainda usa por alguns dias
// enquanto o Pix/boleto compensa ou o cartão é cobrado de novo.
export const DIAS_CARENCIA = 3;

const DIA_MS = 24 * 60 * 60 * 1000;

type EstadoAssinatura = Pick<Barbearia, "assinatura_status" | "assinatura_valido_ate">;

/** Até quando a barbearia pode usar o Naviu (null = sem data, bloqueada). */
export function acessoAte(b: EstadoAssinatura): Date | null {
  if (!b.assinatura_valido_ate) return null;
  const validade = new Date(b.assinatura_valido_ate);
  // Teste e cancelada valem até a data exata; mensalidade paga tem carência.
  if (b.assinatura_status === "ativa" || b.assinatura_status === "atrasada") {
    return new Date(validade.getTime() + DIAS_CARENCIA * DIA_MS);
  }
  return validade;
}

export function acessoLiberado(b: EstadoAssinatura, agora = new Date()): boolean {
  const ate = acessoAte(b);
  return ate !== null && agora < ate;
}

/** Dias inteiros que faltam até `data` (0 se já passou). */
export function diasRestantes(data: string | Date | null, agora = new Date()): number {
  if (!data) return 0;
  const ms = new Date(data).getTime() - agora.getTime();
  return ms > 0 ? Math.ceil(ms / DIA_MS) : 0;
}

/**
 * Até quando um pagamento cobre o uso: vencimento (AAAA-MM-DD, horário de
 * Brasília) + 1 mês + 1 dia, o tempo do cartão ser cobrado no próximo vencimento.
 */
export function cobreAte(vencimento: string): Date {
  const d = new Date(`${vencimento}T23:59:00-03:00`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/** Hoje em São Paulo, AAAA-MM-DD. */
export function hojeSP(agora = new Date()): string {
  return agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Data AAAA-MM-DD em São Paulo de um instante. */
export function dataSP(instante: string | Date): string {
  return new Date(instante).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
