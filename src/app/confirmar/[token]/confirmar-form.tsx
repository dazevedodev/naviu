"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/tela-agendamento";
import { confirmarPresencaViaToken } from "./actions";

export function ConfirmarForm({ token }: { token: string }) {
  const [resultado, setResultado] = useState<{ error: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (resultado && !resultado.error) {
    return <Aviso tom="ok">Presença confirmada. Até lá!</Aviso>;
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => setResultado(await confirmarPresencaViaToken(token)))
        }
        className={BOTAO_PRINCIPAL}
      >
        {isPending ? "Confirmando…" : "Sim, vou"}
      </button>
      <Link href={`/cancelar/${token}`} className={BOTAO_SECUNDARIO}>
        Não vou poder ir
      </Link>
      {resultado?.error && <Aviso tom="erro">{resultado.error}</Aviso>}
    </div>
  );
}
