"use client";

import { useState, useTransition } from "react";
import type { Servico } from "@/lib/types";
import { atualizarDetalhesServico } from "../actions";

export function DetalhesServicoForm({ servico }: { servico: Servico }) {
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(servico.imagem_url);

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await atualizarDetalhesServico(servico.id, formData);
          setError(result.error);
          setSalvo(!result.error);
        })
      }
      className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Foto
      </label>
      <p className="mb-1 text-xs text-zinc-500">
        Aparece pro cliente na página pública, junto com o serviço.
      </p>
      <div className="mb-4 flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={servico.nome}
            className="h-14 w-14 rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700">
            Sem foto
          </div>
        )}
        <input
          name="imagem"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
          className="flex-1 text-xs text-zinc-600 dark:text-zinc-400"
        />
      </div>

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Categoria
      </label>
      <p className="mb-1 text-xs text-zinc-500">
        Agrupa os serviços na página do cliente. Use o mesmo nome em todos do grupo.
      </p>
      <input
        name="categoria"
        list="categorias-servico"
        placeholder="Ex: Cabelo, Barba, Combos"
        defaultValue={servico.categoria ?? ""}
        maxLength={40}
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <datalist id="categorias-servico">
        {["Cabelo", "Barba", "Combos", "Sobrancelha", "Química", "Tratamentos"].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Legenda
      </label>
      <p className="mb-1 text-xs text-zinc-500">
        Aparece pro cliente, embaixo do nome do serviço.
      </p>
      <input
        name="legenda"
        placeholder="Ex: inclui toalha quente e acabamento na navalha"
        defaultValue={servico.legenda ?? ""}
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Observação interna
      </label>
      <p className="mb-1 text-xs text-zinc-500">
        Só você vê — o cliente nunca vê isso.
      </p>
      <textarea
        name="observacao_interna"
        rows={3}
        placeholder="Ex: usar só a tesoura X, cliente costuma atrasar"
        defaultValue={servico.observacao_interna ?? ""}
        className="mb-6 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {salvo && !error && (
        <p className="mb-4 text-sm text-green-700 dark:text-green-400">Salvo!</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-zinc-950 py-2.5 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
