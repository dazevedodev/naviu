// Acesso à API do Asaas (mesma conta usada nos outros produtos da Zantte).
// ASAAS_AMBIENTE=sandbox usa o ambiente de testes; qualquer outro valor (ou
// vazio) usa a conta real. Só pra uso no servidor.

export class AsaasNaoConfigurado extends Error {}

export type PagamentoAsaas = {
  id: string;
  status: string;
  subscription?: string;
  externalReference?: string;
  invoiceUrl?: string;
  dueDate: string; // AAAA-MM-DD
  value?: number;
  deleted?: boolean;
};

export type AssinaturaAsaas = {
  id: string;
  status?: string;
  deleted?: boolean;
  externalReference?: string;
};

// Toda cobrança do Naviu leva esse prefixo no externalReference, pra não se
// misturar com as da RunTrack na mesma conta (os webhooks recebem tudo).
export const PREFIXO_REFERENCIA = "naviu:";

export function asaas() {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new AsaasNaoConfigurado("ASAAS_API_KEY não configurada.");
  const base =
    process.env.ASAAS_AMBIENTE === "sandbox"
      ? "https://api-sandbox.asaas.com/v3"
      : "https://api.asaas.com/v3";

  return async function chamar<T = Record<string, unknown>>(
    caminho: string,
    opcoes: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const resposta = await fetch(`${base}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: {
        access_token: chave,
        "Content-Type": "application/json",
        "User-Agent": "Naviu",
      },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
      cache: "no-store",
    });
    const texto = await resposta.text();
    const dados = texto ? JSON.parse(texto) : {};
    if (!resposta.ok) {
      const motivo =
        (dados?.errors as { description?: string }[] | undefined)?.[0]?.description ??
        `Asaas respondeu ${resposta.status}`;
      throw new Error(motivo);
    }
    return dados as T;
  };
}

/** Fatura em aberto (ou vencida) da assinatura, a mais antiga primeiro. */
export async function faturaAberta(
  chamar: ReturnType<typeof asaas>,
  assinaturaId: string,
): Promise<PagamentoAsaas | undefined> {
  const { data } = await chamar<{ data: PagamentoAsaas[] }>(
    `/subscriptions/${encodeURIComponent(assinaturaId)}/payments?limit=20`,
  );
  return (data ?? [])
    .filter((p) => p.status === "PENDING" || p.status === "OVERDUE")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}
