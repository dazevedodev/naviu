"use client";

import { useTransition } from "react";
import type { FormaPagamento } from "@/lib/types";
import { cancelarAgendamento, concluirAgendamento, definirFormaPagamento } from "./actions";

const LABEL_FORMA: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  pix: "PIX",
};

export function AgendamentoRow({
  id,
  hora,
  clienteNome,
  clienteTelefone,
  servicoNome,
  servicoPreco,
  status,
  formaPagamento,
}: {
  id: string;
  hora: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  servicoPreco: number;
  status: string;
  formaPagamento: FormaPagamento | null;
}) {
  const [isPending, startTransition] = useTransition();
  const finalizado = status === "cancelado" || status === "concluido";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
          {hora} — {clienteNome}
        </p>
        <p className="text-xs text-zinc-500">
          {clienteTelefone} · {servicoNome} ·{" "}
          {servicoPreco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <select
          disabled={isPending}
          defaultValue={formaPagamento ?? ""}
          onChange={(e) =>
            startTransition(() =>
              definirFormaPagamento(id, e.target.value as FormaPagamento),
            )
          }
          className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Forma de pagamento
          </option>
          {(Object.keys(LABEL_FORMA) as FormaPagamento[]).map((f) => (
            <option key={f} value={f}>
              {LABEL_FORMA[f]}
            </option>
          ))}
        </select>

        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {status}
        </span>

        {!finalizado && (
          <>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => concluirAgendamento(id))}
              className="text-xs font-medium text-green-700 hover:underline disabled:opacity-50 dark:text-green-400"
            >
              Concluir
            </button>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => cancelarAgendamento(id))}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
