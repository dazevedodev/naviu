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
        className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      />
      <button
        type="button"
        onClick={copiar}
        className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
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
