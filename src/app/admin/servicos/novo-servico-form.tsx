"use client";

import { useRef, useState, useTransition } from "react";
import { criarServico } from "./actions";

export function NovoServicoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const result = await criarServico(formData);
          setError(result.error);
          if (!result.error) formRef.current?.reset();
        })
      }
      className="flex flex-wrap items-center gap-2"
    >
      <input
        name="nome"
        placeholder="Nome do serviço"
        required
        className="w-48 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-navalha"
      />
      <input
        name="duracao_min"
        type="number"
        min={5}
        step={5}
        placeholder="Duração (min)"
        required
        className="w-36 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-navalha"
      />
      <input
        name="preco"
        type="number"
        min={0}
        step="0.01"
        placeholder="Preço (R$)"
        required
        className="w-32 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-navalha"
      />
      <label className="flex items-center gap-1.5 text-xs text-aco">
        <input
          type="checkbox"
          name="mostrar_duracao"
          defaultChecked
          className="h-3.5 w-3.5"
        />
        Mostrar duração pro cliente
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-navalha px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Adicionando..." : "Adicionar"}
      </button>
      {error && <p className="w-full text-sm text-navalha">{error}</p>}
    </form>
  );
}
