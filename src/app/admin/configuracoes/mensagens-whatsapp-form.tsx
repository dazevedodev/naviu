"use client";

import { useState, useTransition } from "react";
import type { Barbearia } from "@/lib/types";
import { salvarMensagensWhatsApp } from "./actions";

const VARIAVEIS = "{{cliente}} {{barbearia}} {{barbeiro}} {{servico}} {{data}} {{hora}}";

export function MensagensWhatsAppForm({ barbearia }: { barbearia: Barbearia }) {
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await salvarMensagensWhatsApp(formData);
          setError(result.error);
          setSalvo(!result.error);
        })
      }
      className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="mb-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Mensagens do WhatsApp
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        Variáveis disponíveis: {VARIAVEIS}
      </p>

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Confirmação de agendamento
      </label>
      <textarea
        name="mensagem_confirmacao"
        required
        rows={3}
        defaultValue={barbearia.mensagem_confirmacao}
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Lembrete (1h antes)
      </label>
      <textarea
        name="mensagem_lembrete"
        required
        rows={3}
        defaultValue={barbearia.mensagem_lembrete}
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
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
