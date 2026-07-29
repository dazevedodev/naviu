"use client";

import { useState, useTransition } from "react";
import { salvarHorariosSemana, type DiaHorario, type ModoHorario } from "./actions";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SEG_A_SEX = [1, 2, 3, 4, 5];
const SEG_A_SAB = [1, 2, 3, 4, 5, 6];
const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];

const INTERVALOS_RAPIDOS = [15, 30, 60];

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
  const [novoHorarioManual, setNovoHorarioManual] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Seleção de dias pra aplicar o mesmo horário em vários de uma vez — os
  // atalhos só marcam a seleção, quem decide de verdade é o botão
  // "Aplicar", então dá pra ajustar quais dias entram antes de confirmar.
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [configMassa, setConfigMassa] = useState({
    hora_inicio: "09:00",
    hora_fim: horarioFechamentoPadrao.slice(0, 5),
    intervalo_min: 60,
  });

  function atualizarDia(diaSemana: number, mudanca: Partial<DiaHorario>) {
    setSalvo(false);
    setDias((atual) =>
      atual.map((d) => (d.dia_semana === diaSemana ? { ...d, ...mudanca } : d)),
    );
  }

  function alternarSelecao(diaSemana: number) {
    setDiasSelecionados((atual) =>
      atual.includes(diaSemana)
        ? atual.filter((d) => d !== diaSemana)
        : [...atual, diaSemana].sort(),
    );
  }

  function aplicarConfigMassa() {
    if (diasSelecionados.length === 0) return;
    setSalvo(false);
    setDias((atual) =>
      atual.map((d) =>
        diasSelecionados.includes(d.dia_semana)
          ? { ...d, aberto: true, modo: "automatico", ...configMassa }
          : d,
      ),
    );
  }

  function adicionarHorarioManual(diaSemana: number) {
    const hora = novoHorarioManual[diaSemana];
    if (!hora) return;
    const dia = dias.find((d) => d.dia_semana === diaSemana);
    if (dia?.horarios_manuais.includes(hora)) return;

    atualizarDia(diaSemana, {
      horarios_manuais: [...(dia?.horarios_manuais ?? []), hora].sort(),
    });
    setNovoHorarioManual((atual) => ({ ...atual, [diaSemana]: "" }));
  }

  function removerHorarioManual(diaSemana: number, hora: string) {
    const dia = dias.find((d) => d.dia_semana === diaSemana);
    atualizarDia(diaSemana, {
      horarios_manuais: (dia?.horarios_manuais ?? []).filter((h) => h !== hora),
    });
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

      <div className="mb-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
        <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Aplicar o mesmo horário em vários dias de uma vez
        </p>

        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setDiasSelecionados(SEG_A_SEX)}
            className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-400 dark:border-zinc-700"
          >
            Segunda a Sexta
          </button>
          <button
            type="button"
            onClick={() => setDiasSelecionados(SEG_A_SAB)}
            className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-400 dark:border-zinc-700"
          >
            Segunda a Sábado
          </button>
          <button
            type="button"
            onClick={() => setDiasSelecionados(TODOS_OS_DIAS)}
            className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-400 dark:border-zinc-700"
          >
            Todos os dias
          </button>
        </div>

        <p className="mb-1 text-xs text-zinc-500">
          Os atalhos só marcam a seleção abaixo — ajuste os dias como quiser
          antes de aplicar.
        </p>
        <div className="mb-3 flex flex-wrap gap-1">
          {DIAS.map((label, dia) => (
            <label
              key={dia}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${
                diasSelecionados.includes(dia)
                  ? "border-zinc-950 bg-zinc-950 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                  : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
              }`}
            >
              <input
                type="checkbox"
                checked={diasSelecionados.includes(dia)}
                onChange={() => alternarSelecao(dia)}
                className="h-3 w-3"
              />
              {label.slice(0, 3)}
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="time"
            value={configMassa.hora_inicio}
            onChange={(e) =>
              setConfigMassa((atual) => ({ ...atual, hora_inicio: e.target.value }))
            }
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="text-zinc-500">até</span>
          <input
            type="time"
            value={configMassa.hora_fim}
            onChange={(e) =>
              setConfigMassa((atual) => ({ ...atual, hora_fim: e.target.value }))
            }
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="text-zinc-500">a cada</span>
          <input
            type="number"
            min={1}
            value={configMassa.intervalo_min}
            onChange={(e) =>
              setConfigMassa((atual) => ({
                ...atual,
                intervalo_min: Math.max(1, Number(e.target.value) || 1),
              }))
            }
            className="w-16 rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="text-zinc-500">min</span>

          <button
            type="button"
            onClick={aplicarConfigMassa}
            disabled={diasSelecionados.length === 0}
            className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-50 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950"
          >
            Aplicar
            {diasSelecionados.length > 0 ? ` a ${diasSelecionados.length} dia(s)` : ""}
          </button>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
        {dias.map((d) => (
          <div key={d.dia_semana} className="py-3">
            <label className="flex items-center gap-2 text-sm text-zinc-950 dark:text-zinc-50">
              <input
                type="checkbox"
                checked={d.aberto}
                onChange={(e) =>
                  atualizarDia(d.dia_semana, {
                    aberto: e.target.checked,
                    hora_inicio: d.hora_inicio || "09:00",
                    hora_fim: d.hora_fim || horarioFechamentoPadrao.slice(0, 5),
                    intervalo_min: d.intervalo_min || 60,
                  })
                }
                className="h-4 w-4"
              />
              {DIAS[d.dia_semana]}
              {!d.aberto && <span className="text-sm font-normal text-zinc-400">Fechado</span>}
            </label>

            {d.aberto && (
              <div className="mt-2 ml-6 flex flex-col gap-3">
                <div className="flex gap-1 text-xs">
                  {(["automatico", "manual"] as ModoHorario[]).map((modo) => (
                    <button
                      key={modo}
                      type="button"
                      onClick={() => atualizarDia(d.dia_semana, { modo })}
                      className={`rounded-full border px-3 py-1 ${
                        d.modo === modo
                          ? "border-zinc-950 bg-zinc-950 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                          : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      {modo === "automatico" ? "Automático" : "Manual"}
                    </button>
                  ))}
                </div>

                {d.modo === "automatico" ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        value={d.hora_inicio}
                        onChange={(e) =>
                          atualizarDia(d.dia_semana, { hora_inicio: e.target.value })
                        }
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <span className="text-xs text-zinc-500">até</span>
                      <input
                        type="time"
                        value={d.hora_fim}
                        onChange={(e) => atualizarDia(d.dia_semana, { hora_fim: e.target.value })}
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <span className="text-xs text-zinc-500">a cada</span>
                      <input
                        type="number"
                        min={1}
                        value={d.intervalo_min}
                        onChange={(e) =>
                          atualizarDia(d.dia_semana, {
                            intervalo_min: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-16 rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <span className="text-xs text-zinc-500">min</span>
                      {INTERVALOS_RAPIDOS.map((min) => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => atualizarDia(d.dia_semana, { intervalo_min: min })}
                          className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
                        >
                          {min}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span>Pausa (ex.: almoço):</span>
                      <input
                        type="time"
                        value={d.pausa_inicio}
                        onChange={(e) =>
                          atualizarDia(d.dia_semana, { pausa_inicio: e.target.value })
                        }
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <span>até</span>
                      <input
                        type="time"
                        value={d.pausa_fim}
                        onChange={(e) => atualizarDia(d.dia_semana, { pausa_fim: e.target.value })}
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <span>(opcional)</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {d.horarios_manuais.length === 0 && (
                        <p className="text-xs text-zinc-400">Nenhum horário adicionado.</p>
                      )}
                      {d.horarios_manuais.map((hora) => (
                        <span
                          key={hora}
                          className="flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                        >
                          {hora}
                          <button
                            type="button"
                            onClick={() => removerHorarioManual(d.dia_semana, hora)}
                            className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={novoHorarioManual[d.dia_semana] ?? ""}
                        onChange={(e) =>
                          setNovoHorarioManual((atual) => ({
                            ...atual,
                            [d.dia_semana]: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => adicionarHorarioManual(d.dia_semana)}
                        className="rounded-lg bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                      >
                        + adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
