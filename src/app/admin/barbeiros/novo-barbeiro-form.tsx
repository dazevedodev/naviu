"use client";

import { useRef, useState, useTransition } from "react";
import { BOTAO, CAMPO } from "../ui";
import { criarBarbeiro } from "./actions";

export function NovoBarbeiroForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const result = await criarBarbeiro(formData);
          setError(result.error);
          if (!result.error) formRef.current?.reset();
        })
      }
      className="flex flex-wrap gap-2"
    >
      <input
        name="nome"
        placeholder="Nome do barbeiro"
        required
        className={`${CAMPO} max-w-xs flex-1`}
      />
      <button
        type="submit"
        disabled={isPending}
        className={BOTAO}
      >
        {isPending ? "Adicionando…" : "Adicionar barbeiro"}
      </button>
      {error && <p className="self-center text-sm text-navalha">{error}</p>}
    </form>
  );
}
