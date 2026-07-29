"use client";

import { useState, useTransition } from "react";
import type { Barbearia } from "@/lib/types";
import { salvarAparencia } from "./actions";

const COR_MARCA_PADRAO = "#09090b";
const COR_FUNDO_PADRAO = "#fafafa";

export function AparenciaForm({ barbearia }: { barbearia: Barbearia }) {
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [previewLogo, setPreviewLogo] = useState<string | null>(barbearia.logo_url);
  const [previewCapa, setPreviewCapa] = useState<string | null>(barbearia.capa_url);
  const [cor, setCor] = useState(barbearia.tema?.cor_primaria || COR_MARCA_PADRAO);
  const [personalizarFundo, setPersonalizarFundo] = useState(
    Boolean(barbearia.tema?.cor_fundo),
  );
  const [corFundo, setCorFundo] = useState(barbearia.tema?.cor_fundo || COR_FUNDO_PADRAO);

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await salvarAparencia(formData);
          setError(result.error);
          setSalvo(!result.error);
        })
      }
      className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="mb-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Aparência
      </h2>
      <p className="mb-4 text-xs text-zinc-500">
        Tudo aqui é opcional — sem mexer em nada, sua página fica no visual
        padrão do Naviu. Personalize o que quiser.
      </p>

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Capa
      </label>
      <p className="mb-1 text-xs text-zinc-500">
        Imagem larga no topo da página, tipo capa do Facebook (opcional).
      </p>
      <div className="mb-4">
        {previewCapa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewCapa}
            alt="Capa"
            className="mb-2 h-24 w-full rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
          />
        ) : (
          <div className="mb-2 flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700">
            Sem capa
          </div>
        )}
        <input
          name="capa"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreviewCapa(URL.createObjectURL(file));
          }}
          className="w-full text-xs text-zinc-600 dark:text-zinc-400"
        />
      </div>

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Logo
      </label>
      <div className="mb-4 flex items-center gap-3">
        {previewLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewLogo}
            alt="Logo"
            className="h-14 w-14 rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700">
            Sem logo
          </div>
        )}
        <input
          name="logo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreviewLogo(URL.createObjectURL(file));
          }}
          className="flex-1 text-xs text-zinc-600 dark:text-zinc-400"
        />
      </div>

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Descrição
      </label>
      <p className="mb-1 text-xs text-zinc-500">
        Um texto curto que o cliente vê na sua página (opcional).
      </p>
      <textarea
        name="descricao"
        rows={2}
        placeholder="Ex: Tradição e cuidado desde 2015, no coração do bairro."
        defaultValue={barbearia.descricao ?? ""}
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />

      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Cor da marca
      </label>
      <p className="mb-1 text-xs text-zinc-500">Usada no botão de agendar e nos destaques.</p>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="color"
          value={cor}
          onChange={(e) => setCor(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-zinc-300 dark:border-zinc-700"
        />
        <input
          name="cor_primaria"
          value={cor}
          onChange={(e) => setCor(e.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={personalizarFundo}
          onChange={(e) => setPersonalizarFundo(e.target.checked)}
          className="h-4 w-4"
        />
        Personalizar cor de fundo
      </label>
      {personalizarFundo && (
        <div className="mb-4 flex items-center gap-3">
          <input
            type="color"
            value={corFundo}
            onChange={(e) => setCorFundo(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-zinc-300 dark:border-zinc-700"
          />
          <input
            name="cor_fundo"
            value={corFundo}
            onChange={(e) => setCorFundo(e.target.value)}
            pattern="#[0-9a-fA-F]{6}"
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}

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
