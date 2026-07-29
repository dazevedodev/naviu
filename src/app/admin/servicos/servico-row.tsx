"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { alternarAtivoServico, apagarServico } from "./actions";

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
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [erroApagar, setErroApagar] = useState<string | null>(null);

  function apagar() {
    startTransition(async () => {
      const result = await apagarServico(id);
      if (result.error) {
        setErroApagar(result.error);
        setConfirmandoApagar(false);
      }
    });
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-4 ${
        ativo
          ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          : "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <Link href={`/admin/servicos/${id}`} className="hover:underline">
          <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{nome}</p>
          <p className="text-xs text-zinc-500">
            {duracaoMin} min ·{" "}
            {preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </Link>

        <div className="flex items-center gap-2">
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

          {!confirmandoApagar ? (
            <button
              disabled={isPending}
              onClick={() => setConfirmandoApagar(true)}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
            >
              Apagar
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs">
              <span className="text-zinc-500">Apagar de vez?</span>
              <button
                disabled={isPending}
                onClick={apagar}
                className="font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Sim
              </button>
              <button
                disabled={isPending}
                onClick={() => setConfirmandoApagar(false)}
                className="text-zinc-500 hover:underline"
              >
                Não
              </button>
            </span>
          )}
        </div>
      </div>
      {erroApagar && <p className="text-xs text-red-600 dark:text-red-400">{erroApagar}</p>}
    </div>
  );
}
