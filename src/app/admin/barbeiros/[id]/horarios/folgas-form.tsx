"use client";

import { useRef, useState, useTransition } from "react";
import { criarFolga } from "./actions";

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function FolgasForm({ barbeiroId }: { barbeiroId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [diaInteiro, setDiaInteiro] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const result = await criarFolga(barbeiroId, formData);
          setError(result.error);
          if (!result.error) formRef.current?.reset();
        })
      }
      className="flex flex-wrap items-end gap-3"
    >
      <div>
        <label className="mb-1 block text-xs text-zinc-500">De</label>
        <input
          type="date"
          name="data_inicio"
          required
          min={hojeISO()}
          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {diaInteiro && (
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Até (opcional)</label>
          <input
            type="date"
            name="data_fim"
            min={hojeISO()}
            placeholder="mesma data"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}

      <label className="flex items-center gap-1 pb-2 text-xs text-zinc-600 dark:text-zinc-400">
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
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Início</label>
            <input
              type="time"
              name="hora_inicio"
              required
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Fim</label>
            <input
              type="time"
              name="hora_fim"
              required
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </>
      )}

      <div className="flex-1">
        <label className="mb-1 block text-xs text-zinc-500">Motivo (opcional)</label>
        <input
          type="text"
          name="motivo"
          placeholder="Ex: férias"
          className="w-full min-w-[8rem] rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
      >
        {isPending ? "Salvando..." : "Marcar folga"}
      </button>
      {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
