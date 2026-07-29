"use client";

import { useState, useTransition } from "react";
import { solicitarSitePersonalizado } from "./actions";

export function SitePersonalizadoForm() {
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (enviado) {
    return (
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Site personalizado
        </h2>
        <p className="text-sm text-green-700 dark:text-green-400">
          Recebido! Vamos entrar em contato pra conversar sobre o seu site.
        </p>
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await solicitarSitePersonalizado(formData);
          setError(result.error);
          setEnviado(!result.error);
        })
      }
      className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="mb-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Quer um site 100% personalizado?
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        Além do site automático acima, a gente também faz um site sob medida
        pra sua barbearia, com design próprio — por um valor único. Manda uma
        mensagem que a gente te procura pra conversar.
      </p>

      <textarea
        name="mensagem"
        rows={3}
        placeholder="Conta um pouco do que você imagina pro seu site (opcional)"
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-zinc-950 py-2.5 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isPending ? "Enviando..." : "Quero saber mais"}
      </button>
    </form>
  );
}
