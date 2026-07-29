"use client";

import { useState, useTransition } from "react";
import { salvarHorariosSemana, type DiaHorario } from "./actions";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SEG_A_SEX = [1, 2, 3, 4, 5];
const SEG_A_SAB = [1, 2, 3, 4, 5, 6];
const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];

export function HorariosSemanaForm({
  barbeiroId,
  horariosIniciais,
  horarioFechamentoPadrao,
}: {
  barbeiroId: string;
  horariosIniciais: DiaHorario[];
  horarioFechamentoPadrao: string;
}) {
  const [dias, setDias] = useState<DiaHorario[]>(horariosIniciais);
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();

  function atualizarDia(diaSemana: number, mudanca: Partial<DiaHorario>) {
    setSalvo(false);
    setDias((atual) =>
      atual.map((d) => (d.dia_semana === diaSemana ? { ...d, ...mudanca } : d)),
    );
  }

  function aplicarPreset(diasParaAbrir: number[]) {
    setSalvo(false);
    const referencia = dias.find((d) => d.aberto) ?? {
      hora_inicio: "09:00",
      hora_fim: horarioFechamentoPadrao.slice(0, 5),
    };
    setDias((atual) =>
      atual.map((d) =>
        diasParaAbrir.includes(d.dia_semana)
          ? {
              ...d,
              aberto: true,
              hora_inicio: d.hora_inicio || referencia.hora_inicio,
              hora_fim: d.hora_fim || referencia.hora_fim,
            }
          : d,
      ),
    );
  }

  function salvar() {
    startTransition(async () => {
      const result = await salvarHorariosSemana(barbeiroId, dias);
      setError(result.error);
      setSalvo(!result.error);
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Horários da semana
      </p>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => aplicarPreset(SEG_A_SEX)}
          className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-400 dark:border-zinc-700"
        >
          Abrir Seg a Sex
        </button>
        <button
          type="button"
          onClick={() => aplicarPreset(SEG_A_SAB)}
          className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-400 dark:border-zinc-700"
        >
          Abrir Seg a Sáb
        </button>
        <button
          type="button"
          onClick={() => aplicarPreset(TODOS_OS_DIAS)}
          className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-400 dark:border-zinc-700"
        >
          Abrir todos os dias
        </button>
      </div>

      <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
        {dias.map((d) => (
          <div key={d.dia_semana} className="flex flex-wrap items-center gap-3 py-3">
            <label className="flex w-28 shrink-0 items-center gap-2 text-sm text-zinc-950 dark:text-zinc-50">
              <input
                type="checkbox"
                checked={d.aberto}
                onChange={(e) =>
                  atualizarDia(d.dia_semana, {
                    aberto: e.target.checked,
                    hora_inicio: d.hora_inicio || "09:00",
                    hora_fim: d.hora_fim || horarioFechamentoPadrao.slice(0, 5),
                  })
                }
                className="h-4 w-4"
              />
              {DIAS[d.dia_semana]}
            </label>

            {d.aberto ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={d.hora_inicio}
                  onChange={(e) => atualizarDia(d.dia_semana, { hora_inicio: e.target.value })}
                  className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <span className="text-xs text-zinc-500">até</span>
                <input
                  type="time"
                  value={d.hora_fim}
                  onChange={(e) => atualizarDia(d.dia_semana, { hora_fim: e.target.value })}
                  className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Fechado</p>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {salvo && !error && (
        <p className="mt-3 text-sm text-green-700 dark:text-green-400">Salvo!</p>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={isPending}
        className="mt-4 rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isPending ? "Salvando..." : "Salvar horários"}
      </button>
    </div>
  );
}
