"use client";

import { useState, useTransition } from "react";
import type { Barbearia } from "@/lib/types";
import { salvarDadosBarbearia } from "./actions";

export function DadosBarbeariaForm({ barbearia }: { barbearia: Barbearia }) {
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await salvarDadosBarbearia(formData);
          setError(result.error);
          setSalvo(!result.error);
        })
      }
      className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="mb-4 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Dados da barbearia
      </h2>

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Nome
      </label>
      <input
        name="nome"
        required
        defaultValue={barbearia.nome}
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Endereço
      </label>
      <input
        name="endereco"
        placeholder="Rua, número, bairro, cidade"
        defaultValue={barbearia.endereco ?? ""}
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        WhatsApp da barbearia
      </label>
      <input
        name="telefone_whatsapp"
        placeholder="(11) 99999-9999"
        defaultValue={barbearia.telefone_whatsapp ?? ""}
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
  );
}
