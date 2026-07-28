"use client";

import { useTransition } from "react";
import Link from "next/link";
import { alternarAtivoServico } from "./actions";

export function ServicoRow({
  id,
  nome,
  duracaoMin,
  preco,
  ativo,
}: {
  id: string;
  nome: string;
  duracaoMin: number;
  preco: number;
  ativo: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-4 ${
        ativo
          ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          : "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <Link href={`/admin/servicos/${id}`} className="hover:underline">
        <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{nome}</p>
        <p className="text-xs text-zinc-500">
          {duracaoMin} min ·{" "}
          {preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </Link>

      <button
        disabled={isPending}
        onClick={() => startTransition(() => alternarAtivoServico(id, !ativo))}
        className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
          ativo
            ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            : "bg-zinc-950 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        }`}
      >
        {ativo ? "Ativo" : "Inativo — ativar"}
      </button>
    </div>
  );
}
