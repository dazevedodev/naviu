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
          ? "border-black/[0.07] bg-white"
          : "border-black/[0.07] bg-[#F6F1F1] opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <Link href={`/admin/servicos/${id}`} className="hover:underline">
          <p className="text-sm font-medium text-tinta">{nome}</p>
          <p className="text-xs text-white0">
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
                ? "bg-[#F6F1F1] text-tinta hover:bg-rosado/50"
                : "bg-navalha text-white hover:bg-navalha-escuro"
            }`}
          >
            {ativo ? "Ativo" : "Inativo — ativar"}
          </button>

          {!confirmandoApagar ? (
            <button
              disabled={isPending}
              onClick={() => setConfirmandoApagar(true)}
              className="text-xs font-medium text-navalha hover:underline disabled:opacity-50"
            >
              Apagar
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs">
              <span className="text-white0">Apagar de vez?</span>
              <button
                disabled={isPending}
                onClick={apagar}
                className="font-medium text-navalha hover:underline disabled:opacity-50"
              >
                Sim
              </button>
              <button
                disabled={isPending}
                onClick={() => setConfirmandoApagar(false)}
                className="text-white0 hover:underline"
              >
                Não
              </button>
            </span>
          )}
        </div>
      </div>
      {erroApagar && <p className="text-xs text-navalha">{erroApagar}</p>}
    </div>
  );
}
