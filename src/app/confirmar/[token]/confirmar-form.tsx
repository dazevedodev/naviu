"use client";

import { useState, useTransition } from "react";
import { confirmarPresencaViaToken } from "./actions";

export function ConfirmarForm({ token }: { token: string }) {
  const [resultado, setResultado] = useState<{ error: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (resultado && !resultado.error) {
    return (
      <p className="text-sm text-green-700 dark:text-green-400">
        Presença confirmada. Até lá!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => setResultado(await confirmarPresencaViaToken(token)))
        }
        className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? "Confirmando..." : "Confirmar presença"}
      </button>
      <a
        href={`/cancelar/${token}`}
        className="text-center text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        Não vou poder ir
      </a>
      {resultado?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{resultado.error}</p>
      )}
    </div>
  );
}
