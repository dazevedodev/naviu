"use client";

import { useState, useTransition } from "react";
import { NOME_REMUNERACAO, type Remuneracao } from "@/lib/financeiro";
import { salvarRemuneracao } from "./actions";

const EXPLICACAO: Record<Remuneracao, string> = {
  comissao: "Ganha uma porcentagem de cada atendimento. O mais comum é 40% a 60%.",
  fixo_comissao: "Salário fixo por mês, mais uma porcentagem do que atender.",
  aluguel: "Aluga a cadeira: fica com tudo o que atender e paga um valor fixo por mês.",
};

export function RemuneracaoForm({
  id,
  remuneracao,
  comissao,
  fixo,
}: {
  id: string;
  remuneracao: Remuneracao;
  comissao: number;
  fixo: number;
}) {
  const [tipo, setTipo] = useState<Remuneracao>(remuneracao);
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ erro: boolean; texto: string } | null>(null);

  return (
    <form
      action={(fd) =>
        iniciar(async () => {
          const r = await salvarRemuneracao(id, fd);
          setAviso(r.error ? { erro: true, texto: r.error } : { erro: false, texto: "Salvo." });
        })
      }
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#F6F1F1] p-1 text-xs font-semibold sm:text-sm">
        {(Object.keys(NOME_REMUNERACAO) as Remuneracao[]).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={tipo === r}
            onClick={() => setTipo(r)}
            className={`rounded-xl px-2 py-2 ${tipo === r ? "bg-white shadow-sm" : "text-aco"}`}
          >
            {NOME_REMUNERACAO[r]}
          </button>
        ))}
      </div>
      <input type="hidden" name="remuneracao" value={tipo} />
      <p className="text-xs text-aco">{EXPLICACAO[tipo]}</p>

      <div className="flex flex-wrap items-end gap-3">
        {tipo !== "aluguel" && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Comissão
            <span className="flex h-11 w-28 items-center rounded-xl border border-black/10 px-3 focus-within:border-navalha">
              <input
                name="comissao_percentual"
                inputMode="decimal"
                defaultValue={comissao}
                className="min-w-0 flex-1 bg-transparent font-semibold outline-none"
              />
              <span className="text-aco">%</span>
            </span>
          </label>
        )}
        {tipo !== "comissao" && (
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {tipo === "aluguel" ? "Aluguel por mês" : "Salário fixo por mês"}
            <span className="flex h-11 w-40 items-center rounded-xl border border-black/10 px-3 focus-within:border-navalha">
              <span className="text-aco">R$</span>
              <input
                name="valor_fixo"
                inputMode="decimal"
                defaultValue={String(fixo).replace(".", ",")}
                className="ml-2 min-w-0 flex-1 bg-transparent font-semibold outline-none"
              />
            </span>
          </label>
        )}
        <button
          type="submit"
          disabled={pendente}
          className="h-11 rounded-full bg-tinta px-5 text-sm font-semibold text-white hover:bg-navalha disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Salvar"}
        </button>
        {aviso && (
          <p className={`self-center text-sm ${aviso.erro ? "text-navalha" : "text-emerald-700"}`}>{aviso.texto}</p>
        )}
      </div>
    </form>
  );
}
