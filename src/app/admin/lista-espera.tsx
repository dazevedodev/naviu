"use client";

import { useTransition } from "react";
import { sairDaListaDeEspera } from "./actions";

const NOME_PERIODO: Record<string, string> = { manha: "manhã", tarde: "tarde", noite: "noite" };

type Item = {
  id: string;
  data: string; // YYYY-MM-DD
  periodo: string | null;
  nome: string;
  telefone: string;
  avisado: boolean;
  servico: string;
  barbeiro: string | null;
};

// Quem pediu para ser avisado se abrir vaga. O aviso sai sozinho por e-mail
// quando alguém cancela; aqui o barbeiro só acompanha e tira quem já resolveu.
export function ListaEspera({ itens }: { itens: Item[] }) {
  const [isPending, startTransition] = useTransition();
  if (itens.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Lista de espera
      </h2>
      <p className="mb-3 text-xs text-zinc-500">
        Quando alguém cancela, quem está aqui para o mesmo dia recebe um e-mail.
      </p>
      <div className="flex flex-col gap-2">
        {itens.map((i) => (
          <div
            key={i.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                {i.data.split("-").reverse().join("/")}
                {i.periodo ? `, ${NOME_PERIODO[i.periodo]}` : ""} — {i.nome}
              </p>
              <p className="text-xs text-zinc-500">
                {i.telefone} · {i.servico}
                {i.barbeiro ? ` com ${i.barbeiro}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {i.avisado && (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  Avisado
                </span>
              )}
              <button
                disabled={isPending}
                onClick={() => startTransition(() => sairDaListaDeEspera(i.id))}
                className="text-xs font-medium text-zinc-500 hover:underline disabled:opacity-50"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
