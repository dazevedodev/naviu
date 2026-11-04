"use client";

import { useState, useTransition } from "react";
import type { Barbearia } from "@/lib/types";
import { salvarAparencia } from "./actions";

export function AparenciaForm({ barbearia }: { barbearia: Barbearia }) {
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [previewLogo, setPreviewLogo] = useState<string | null>(barbearia.logo_url);
  const [previewCapa, setPreviewCapa] = useState<string | null>(barbearia.capa_url);

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await salvarAparencia(formData);
          setError(result.error);
          setSalvo(!result.error);
        })
      }
      className="max-w-md rounded-3xl bg-white p-6"
    >
      <h2 className="mb-1 text-sm font-semibold text-tinta">
        Aparência
      </h2>
      <p className="mb-4 text-xs text-white0">
        Toda página de barbearia no Naviu tem o mesmo visual vermelho. Aqui você
        coloca a sua capa e a sua foto de perfil; o nome fica em Configurações.
      </p>

      <label className="mb-1 block text-sm font-medium text-tinta">
        Capa
      </label>
      <p className="mb-1 text-xs text-white0">
        Imagem larga no topo da página, tipo capa do Instagram ou Facebook (opcional).
      </p>
      <div className="mb-4">
        {previewCapa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewCapa}
            alt="Capa"
            className="mb-2 h-24 w-full rounded-lg border border-black/[0.07] object-cover"
          />
        ) : (
          <div className="mb-2 flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-black/10 text-xs text-aco/70">
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
          className="w-full text-xs text-aco"
        />
      </div>

      <label className="mb-1 block text-sm font-medium text-tinta">
        Foto de perfil
      </label>
      <div className="mb-4 flex items-center gap-3">
        {previewLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewLogo}
            alt="Foto de perfil"
            className="h-14 w-14 rounded-full border border-black/[0.07] object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-black/10 text-center text-[10px] text-aco/70">
            Sem foto
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
          className="flex-1 text-xs text-aco"
        />
      </div>

      {error && <p className="mb-4 text-sm text-navalha">{error}</p>}
      {salvo && !error && (
        <p className="mb-4 text-sm text-emerald-700">Salvo!</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-[#C1272D] py-2.5 text-sm font-medium text-white hover:bg-[#A51F25] disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
