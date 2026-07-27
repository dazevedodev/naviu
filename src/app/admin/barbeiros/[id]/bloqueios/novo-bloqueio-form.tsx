"use client";

import { useRef, useState, useTransition } from "react";
import { criarBloqueio } from "./actions";

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function NovoBloqueioForm({ barbeiroId }: { barbeiroId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [diaInteiro, setDiaInteiro] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const result = await criarBloqueio(barbeiroId, formData);
          setError(result.error);
          if (!result.error) formRef.current?.reset();
        })
      }
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <p className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Marcar folga/bloqueio
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          name="data"
          required
          min={hojeISO()}
          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />

        <label className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            name="dia_inteiro"
            checked={diaInteiro}
            onChange={(e) => setDiaInteiro(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Dia inteiro
        </label>

        {!diaInteiro && (
          <>
            <input
              type="time"
              name="hora_inicio"
              required={!diaInteiro}
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-xs text-zinc-500">até</span>
            <input
              type="time"
              name="hora_fim"
              required={!diaInteiro}
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </>
        )}

        <input
          type="text"
          name="motivo"
          placeholder="Motivo (opcional)"
          className="min-w-[10rem] flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
        >
          {isPending ? "Salvando..." : "Adicionar"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
