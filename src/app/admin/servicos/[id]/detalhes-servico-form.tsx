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
      className="max-w-md rounded-3xl bg-white p-6"
    >
      <label className="mb-1 block text-sm font-medium text-tinta">
        Foto
      </label>
      <p className="mb-1 text-xs text-white0">
        Aparece pro cliente na página pública, junto com o serviço.
      </p>
      <div className="mb-4 flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={servico.nome}
            className="h-14 w-14 rounded-lg border border-black/[0.07] object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-black/10 text-xs text-aco/70">
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
          className="flex-1 text-xs text-aco"
        />
      </div>

      <label className="mb-1 block text-sm font-medium text-tinta">
        Categoria
      </label>
      <p className="mb-1 text-xs text-white0">
        Agrupa os serviços na página do cliente. Use o mesmo nome em todos do grupo.
      </p>
      <input
        name="categoria"
        list="categorias-servico"
        placeholder="Ex: Cabelo, Barba, Combos"
        defaultValue={servico.categoria ?? ""}
        maxLength={40}
        className="mb-4 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-navalha"
      />
      <datalist id="categorias-servico">
        {["Cabelo", "Barba", "Combos", "Sobrancelha", "Química", "Tratamentos"].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <label className="mb-1 block text-sm font-medium text-tinta">
        Legenda
      </label>
      <p className="mb-1 text-xs text-white0">
        Aparece pro cliente, embaixo do nome do serviço.
      </p>
      <input
        name="legenda"
        placeholder="Ex: inclui toalha quente e acabamento na navalha"
        defaultValue={servico.legenda ?? ""}
        className="mb-4 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-navalha"
      />

      <label className="mb-1 block text-sm font-medium text-tinta">
        Observação interna
      </label>
      <p className="mb-1 text-xs text-white0">
        Só você vê — o cliente nunca vê isso.
      </p>
      <textarea
        name="observacao_interna"
        rows={3}
        placeholder="Ex: usar só a tesoura X, cliente costuma atrasar"
        defaultValue={servico.observacao_interna ?? ""}
        className="mb-6 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-navalha"
      />

      {error && <p className="mb-4 text-sm text-navalha">{error}</p>}
      {salvo && !error && (
        <p className="mb-4 text-sm text-emerald-700">Salvo!</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-navalha py-2.5 text-sm font-medium text-white hover:bg-navalha-escuro disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
