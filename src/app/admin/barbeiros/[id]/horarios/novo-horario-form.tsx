"use client";

import { useRef, useState, useTransition } from "react";
import { adicionarHorario } from "./actions";

export function NovoHorarioForm({
  barbeiroId,
  diaSemana,
  horarioFechamentoPadrao,
}: {
  barbeiroId: string;
  diaSemana: number;
  horarioFechamentoPadrao: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [definirFim, setDefinirFim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const result = await adicionarHorario(barbeiroId, formData);
          setError(result.error);
          if (!result.error) formRef.current?.reset();
        })
      }
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="dia_semana" value={diaSemana} />
      <input
        type="time"
        name="hora_inicio"
        required
        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />

      {definirFim ? (
        <>
          <span className="text-xs text-zinc-500">até</span>
          <input
            type="time"
            name="hora_fim"
            required
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setDefinirFim(true)}
          className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          até {horarioFechamentoPadrao.slice(0, 5)} (padrão — definir outro horário)
        </button>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
      >
        +
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
