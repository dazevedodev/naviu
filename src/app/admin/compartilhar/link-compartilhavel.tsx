"use client";

import { useState } from "react";

export function LinkCompartilhavel({
  url,
  mensagemWhatsApp,
}: {
  url: string;
  mensagemWhatsApp: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const linkWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensagemWhatsApp)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="min-w-0 flex-1 rounded-xl border border-black/10 bg-[#F6F1F1] px-3 py-2 text-sm text-tinta outline-none"
      />
      <button
        type="button"
        onClick={copiar}
        className="rounded-lg bg-navalha px-3 py-2 text-xs font-medium text-white hover:bg-navalha-escuro"
      >
        {copiado ? "Copiado!" : "Copiar link"}
      </button>
      <a
        href={linkWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
      >
        WhatsApp
      </a>
    </div>
  );
}
