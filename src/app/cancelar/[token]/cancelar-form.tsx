"use client";

import { useState, useTransition } from "react";
import { cancelarViaToken } from "./actions";

export function CancelarForm({ token }: { token: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<{ error: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (resultado && !resultado.error) {
    return (
      <p className="text-sm text-green-700 dark:text-green-400">
        Agendamento cancelado. Se quiser marcar outro horário, é só acessar o
        link da barbearia de novo.
      </p>
    );
  }

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Cancelar agendamento
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Tem certeza que quer cancelar esse agendamento?
      </p>
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => setResultado(await cancelarViaToken(token)))
          }
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? "Cancelando..." : "Sim, cancelar"}
        </button>
        <button
          disabled={isPending}
          onClick={() => setConfirmando(false)}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Voltar
        </button>
      </div>
      {resultado?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{resultado.error}</p>
      )}
    </div>
  );
}
