"use client";

import { useState, useTransition } from "react";
import { solicitarSitePersonalizado } from "./actions";

export function SitePersonalizadoForm() {
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (enviado) {
    return (
      <div className="max-w-md rounded-3xl bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-tinta">
          Site personalizado
        </h2>
        <p className="text-sm text-emerald-700">
          Recebido! Vamos entrar em contato pra conversar sobre o seu site.
        </p>
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await solicitarSitePersonalizado(formData);
          setError(result.error);
          setEnviado(!result.error);
        })
      }
      className="max-w-md rounded-2xl border-2 border-navalha bg-white p-6"
    >
      <span className="mb-2 inline-block rounded-full bg-navalha px-2 py-0.5 text-xs font-medium text-white">
        Diferencial
      </span>
      <h2 className="mb-1 text-sm font-semibold text-tinta">
        Quer um site exclusivo, feito só pra sua barbearia?
      </h2>
      <p className="mb-4 text-xs text-white0">
        O que você personalizou acima (logo, capa, cor, descrição) já deixa
        sua página com a sua cara — mas isso ainda é o modelo padrão do
        Naviu. Se você quer se destacar de verdade da concorrência, a gente
        cria um site 100% do zero pra sua marca: layout próprio, seções sob
        medida, tudo pensado só pra sua barbearia. Por um valor único, sem
        mensalidade a mais. Manda uma mensagem que a gente te procura pra
        conversar.
      </p>

      <textarea
        name="mensagem"
        rows={3}
        placeholder="Conta um pouco do que você imagina pro seu site (opcional)"
        className="mb-4 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-navalha"
      />

      {error && <p className="mb-4 text-sm text-navalha">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-navalha py-2.5 text-sm font-medium text-white hover:bg-navalha-escuro disabled:opacity-50"
      >
        {isPending ? "Enviando..." : "Quero saber mais"}
      </button>
    </form>
  );
}
