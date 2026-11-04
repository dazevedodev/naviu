"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso, BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from "@/components/tela-agendamento";
import { cancelarViaToken } from "./actions";

export function CancelarForm({ token, slug }: { token: string; slug?: string }) {
  const [resultado, setResultado] = useState<{ error: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (resultado && !resultado.error) {
    return (
      <div className="flex flex-col gap-3">
        <Aviso tom="ok">Horário cancelado. A barbearia já foi avisada.</Aviso>
        {slug && (
          <Link href={`/${slug}/agendar`} className={BOTAO_PRINCIPAL}>
            Marcar outro horário
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-aco">
        Se cancelar, o horário fica livre para outra pessoa.
      </p>
      <button
        disabled={isPending}
        onClick={() => startTransition(async () => setResultado(await cancelarViaToken(token)))}
        className={BOTAO_PRINCIPAL}
      >
        {isPending ? "Cancelando…" : "Cancelar horário"}
      </button>
      {slug && (
        <Link href={`/${slug}`} className={BOTAO_SECUNDARIO}>
          Manter horário
        </Link>
      )}
      {resultado?.error && <Aviso tom="erro">{resultado.error}</Aviso>}
    </div>
  );
}
