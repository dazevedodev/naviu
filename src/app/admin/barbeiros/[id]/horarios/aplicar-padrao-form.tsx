"use client";

import { useRef, useState, useTransition } from "react";
import { aplicarPadraoHorario } from "./actions";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const SEG_A_SEX = [1, 2, 3, 4, 5];
const SEG_A_SAB = [1, 2, 3, 4, 5, 6];
const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];

export function AplicarPadraoForm({
  barbeiroId,
  horarioFechamentoPadrao,
}: {
  barbeiroId: string;
  horarioFechamentoPadrao: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>(SEG_A_SEX);
  const [definirFim, setDefinirFim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function alternarDia(dia: number) {
    setDiasSelecionados((atual) =>
      atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia].sort(),
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Aplicar um padrão em vários dias de uma vez
      </p>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => setDiasSelecionados(SEG_A_SEX)}
          className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-400 dark:border-zinc-700"
        >
          Seg a Sex
        </button>
        <button
          type="button"
          onClick={() => setDiasSelecionados(SEG_A_SAB)}
          className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-400 dark:border-zinc-700"
        >
          Seg a Sáb
        </button>
        <button
          type="button"
          onClick={() => setDiasSelecionados(TODOS_OS_DIAS)}
          className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-400 dark:border-zinc-700"
        >
          Todos os dias
        </button>
      </div>

      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            const result = await aplicarPadraoHorario(barbeiroId, formData);
            setError(result.error);
          })
        }
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex flex-wrap gap-1">
          {DIAS.map((label, dia) => (
            <label
              key={dia}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-800"
            >
              <input
                type="checkbox"
                name="dias"
                value={dia}
                checked={diasSelecionados.includes(dia)}
                onChange={() => alternarDia(dia)}
                className="h-3 w-3"
              />
              {label}
            </label>
          ))}
        </div>

        <input
          type="time"
          name="hora_inicio"
          required
          defaultValue="09:00"
          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />

        {definirFim ? (
          <>
            <span className="text-xs text-zinc-500">até</span>
            <input
              type="time"
              name="hora_fim"
              required
              defaultValue={horarioFechamentoPadrao.slice(0, 5)}
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
          className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
        >
          {isPending ? "Aplicando..." : "Aplicar"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
