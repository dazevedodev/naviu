"use client";

import { useState, useTransition } from "react";
import type { Barbearia } from "@/lib/types";
import { salvarConfigHorario } from "./actions";

export function ConfigHorarioForm({ barbearia }: { barbearia: Barbearia }) {
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await salvarConfigHorario(formData);
          setError(result.error);
          setSalvo(!result.error);
        })
      }
      className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="mb-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Horários
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        Ao cadastrar o horário de um barbeiro, se você não definir uma hora de
        término, esse horário padrão é usado.
      </p>

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Horário de fechamento padrão
      </label>
      <input
        type="time"
        name="horario_fechamento_padrao"
        required
        defaultValue={barbearia.horario_fechamento_padrao.slice(0, 5)}
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />

      <label className="mb-4 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="mostrar_fim_servico_cliente"
          defaultChecked={barbearia.mostrar_fim_servico_cliente}
          className="h-4 w-4"
        />
        Mostrar pro cliente o horário de término do serviço (ex: &quot;09:00 - 09:30&quot;
        em vez de só &quot;09:00&quot;)
      </label>

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
