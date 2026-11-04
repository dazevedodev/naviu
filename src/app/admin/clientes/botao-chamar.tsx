"use client";

import { useState, useTransition } from "react";
import { marcarChamado } from "./actions";

// Abre o WhatsApp com a mensagem pronta e anota que o cliente foi chamado.
export function BotaoChamar({ id, href, className }: { id: string; href: string; className?: string }) {
  const [pendente, iniciar] = useTransition();
  const [chamado, setChamado] = useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        setChamado(true);
        iniciar(async () => {
          await marcarChamado(id);
        });
      }}
      className={
        className ??
        "relative z-10 shrink-0 rounded-full bg-[#F6F1F1] px-3 py-1.5 text-xs font-semibold text-navalha hover:bg-rosado/60"
      }
    >
      {chamado || pendente ? "Chamado ✓" : "Chamar"}
    </a>
  );
}
