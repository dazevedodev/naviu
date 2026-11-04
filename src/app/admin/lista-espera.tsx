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
    <section className="mt-8 rounded-3xl bg-white p-5 lg:p-6">
      <h2 className="font-display text-base font-semibold">Lista de espera</h2>
      <p className="mb-4 mt-1 text-sm text-aco">
        Quando alguém cancela, quem está aqui para o mesmo dia recebe um e-mail.
      </p>
      <ul className="divide-y divide-black/[0.06]">
        {itens.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-semibold">
                {i.nome}{" "}
                <span className="font-normal text-aco">
                  · {i.data.split("-").reverse().slice(0, 2).join("/")}
                  {i.periodo ? `, ${NOME_PERIODO[i.periodo]}` : ""}
                </span>
              </p>
              <p className="text-sm text-aco">
                {i.servico}
                {i.barbeiro ? ` com ${i.barbeiro}` : ""} · {i.telefone}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {i.avisado && (
                <span className="rounded-full bg-[#F6F1F1] px-3 py-1 text-xs font-semibold text-aco">Avisado</span>
              )}
              <button
                disabled={isPending}
                onClick={() => startTransition(() => sairDaListaDeEspera(i.id))}
                className="text-sm font-medium text-aco hover:text-navalha disabled:opacity-50"
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
