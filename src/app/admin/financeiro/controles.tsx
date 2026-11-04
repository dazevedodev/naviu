"use client";

import { useRef, useState, useTransition } from "react";
import { reais } from "@/lib/financeiro";
import { BOTAO, CAMPO } from "../ui";
import { adicionarLancamento, pagarBarbeiro, removerLancamento } from "./actions";

export function BotaoPagar({
  barbeiroId,
  nome,
  valor,
  mes,
  mesRotulo,
}: {
  barbeiroId: string;
  nome: string;
  valor: number;
  mes: string;
  mesRotulo: string;
}) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      disabled={pendente}
      onClick={() => {
        if (confirm(`Registrar que você pagou ${reais(valor)} para ${nome}?`)) {
          iniciar(async () => {
            const r = await pagarBarbeiro(barbeiroId, valor, mes, mesRotulo);
            if (r.error) alert(r.error);
          });
        }
      }}
      className="rounded-full bg-tinta px-4 py-2 text-sm font-semibold text-white hover:bg-navalha disabled:opacity-50"
    >
      {pendente ? "Salvando…" : `Paguei ${reais(valor)}`}
    </button>
  );
}

export function RemoverLancamento({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      disabled={pendente}
      aria-label="Apagar lançamento"
      onClick={() => confirm("Apagar este lançamento?") && iniciar(async () => void (await removerLancamento(id)))}
      className="rounded-full px-2 text-lg leading-none text-aco hover:bg-[#F6F1F1] hover:text-navalha disabled:opacity-50"
    >
      ×
    </button>
  );
}

const ABAS = [
  { tipo: "despesa", nome: "Despesa" },
  { tipo: "vale", nome: "Vale" },
] as const;

export function NovoLancamento({
  barbeiros,
  hoje,
}: {
  barbeiros: { id: string; nome: string }[];
  hoje: string;
}) {
  const [tipo, setTipo] = useState<"despesa" | "vale">("despesa");
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      action={(fd) =>
        iniciar(async () => {
          const r = await adicionarLancamento(fd);
          setErro(r.error);
          if (!r.error) form.current?.reset();
        })
      }
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="tipo" value={tipo} />
      <div className="grid grid-cols-2 gap-1 rounded-full bg-[#F6F1F1] p-1 text-sm font-semibold">
        {ABAS.map((a) => (
          <button
            key={a.tipo}
            type="button"
            aria-pressed={tipo === a.tipo}
            onClick={() => setTipo(a.tipo)}
            className={`rounded-full py-2 ${tipo === a.tipo ? "bg-white shadow-sm" : "text-aco"}`}
          >
            {a.nome}
          </button>
        ))}
      </div>
      <p className="text-xs text-aco">
        {tipo === "despesa"
          ? "Aluguel, luz, produtos, manutenção: o que a barbearia gastou."
          : "Dinheiro adiantado a um barbeiro. Sai do que ele tem a receber no mês."}
      </p>

      {tipo === "vale" && (
        <select name="barbeiro_id" required defaultValue="" className={CAMPO}>
          <option value="" disabled>
            Para quem?
          </option>
          {barbeiros.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
      )}
      <input
        name="descricao"
        required={tipo === "despesa"}
        placeholder={tipo === "despesa" ? "Ex.: conta de luz" : "Observação (opcional)"}
        maxLength={120}
        className={CAMPO}
      />
      <div className="grid grid-cols-2 gap-2">
        <span className="flex h-11 items-center rounded-xl border border-black/10 bg-white px-3 focus-within:border-navalha">
          <span className="text-sm text-aco">R$</span>
          <input
            name="valor"
            required
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Valor"
            className="ml-2 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
          />
        </span>
        <input name="data" type="date" defaultValue={hoje} aria-label="Data" className={CAMPO} />
      </div>
      {erro && <p className="text-sm text-navalha">{erro}</p>}
      <button type="submit" disabled={pendente} className={BOTAO}>
        {pendente ? "Salvando…" : tipo === "despesa" ? "Lançar despesa" : "Lançar vale"}
      </button>
    </form>
  );
}
