"use client";

import { useState, useTransition } from "react";
import type { Barbearia } from "@/lib/types";
import { salvarConfigSinal } from "./actions";

const CHECKOUT_ADDON_SINAL = process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL_ADDON_SINAL;

export function ConfigSinalForm({
  barbearia,
  usuarioEmail,
}: {
  barbearia: Barbearia;
  usuarioEmail: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();

  const addonAtivo = barbearia.sinal_addon_status === "ativo";

  // A liberação do complemento (via webhook da Kiwify) é feita batendo o
  // e-mail da compra com o e-mail cadastrado aqui — pré-preencher o
  // checkout com esse e-mail evita que a pessoa compre com um e-mail
  // diferente por engano e o pagamento não libere nada automaticamente.
  const checkoutUrl =
    CHECKOUT_ADDON_SINAL && usuarioEmail
      ? `${CHECKOUT_ADDON_SINAL}?email=${encodeURIComponent(usuarioEmail)}`
      : CHECKOUT_ADDON_SINAL;

  return (
    <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Sinal (pagamento antecipado)
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        Complemento pago — R$5,99/mês a mais na sua assinatura.
      </p>

      {!addonAtivo ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <p className="mb-3 text-amber-900 dark:text-amber-200">
            Pra exigir sinal via PIX antes de confirmar agendamentos, assine
            esse complemento por <strong>R$5,99/mês</strong>.
          </p>
          <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
            A liberação é automática depois do pagamento, batendo o e-mail da
            compra com o do seu login aqui — o checkout abaixo já vem com seu
            e-mail preenchido, só não muda esse campo na hora de pagar.
          </p>
          {checkoutUrl ? (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-zinc-950 px-4 py-2 text-xs font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Assinar complemento
            </a>
          ) : (
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Checkout ainda não configurado — fale com o suporte.
            </p>
          )}
        </div>
      ) : (
        <form
          action={(formData) =>
            startTransition(async () => {
              const result = await salvarConfigSinal(formData);
              setError(result.error);
              setSalvo(!result.error);
            })
          }
        >
          <label className="mb-4 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              name="sinal_ativo"
              defaultChecked={barbearia.sinal_ativo}
              className="h-4 w-4"
            />
            Exigir sinal para confirmar agendamento
          </label>

          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tipo
          </label>
          <select
            name="sinal_tipo"
            defaultValue={barbearia.sinal_tipo}
            className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="fixo">Valor fixo (R$)</option>
            <option value="percentual">Percentual do serviço (%)</option>
          </select>

          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Valor
          </label>
          <input
            name="sinal_valor"
            type="number"
            min={0}
            step="0.01"
            defaultValue={barbearia.sinal_valor}
            className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />

          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tempo para expirar sem pagamento (min)
          </label>
          <input
            name="sinal_tempo_expiracao_min"
            type="number"
            min={1}
            defaultValue={barbearia.sinal_tempo_expiracao_min}
            className="mb-6 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />

          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {salvo && !error && (
            <p className="mb-4 text-sm text-green-700 dark:text-green-400">Salvo!</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-zinc-950 py-2.5 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}
    </div>
  );
}
