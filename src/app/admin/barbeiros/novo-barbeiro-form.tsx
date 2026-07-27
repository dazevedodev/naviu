"use client";

import { useRef, useState, useTransition } from "react";
import { criarBarbeiro } from "./actions";

export function NovoBarbeiroForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const result = await criarBarbeiro(formData);
          setError(result.error);
          if (!result.error) formRef.current?.reset();
        })
      }
      className="flex gap-2"
    >
      <input
        name="nome"
        placeholder="Nome do barbeiro"
        required
        className="flex-1 max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
      >
        {isPending ? "Adicionando..." : "Adicionar"}
      </button>
      {error && <p className="self-center text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
