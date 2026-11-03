"use client";

import { useTransition } from "react";
import { NOME_STATUS, type FormaPagamento } from "@/lib/types";
import { cancelarAgendamento, concluirAgendamento, definirFormaPagamento, marcarFalta } from "./actions";

const LABEL_FORMA: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  pix: "PIX",
};

// Só um redirecionamento pro WhatsApp do cliente (sem mensagem pronta) — a
// confirmação/lembrete automáticos já vão por e-mail, isso aqui é só pro
// admin poder falar com o cliente na hora se precisar.
function linkWhatsApp(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${numero}`;
}

export function AgendamentoRow({
  id,
  hora,
  clienteNome,
  clienteTelefone,
  servicoNome,
  servicoPreco,
  status,
  formaPagamento,
  alertaHistorico,
  presencaConfirmada,
  jaComecou,
}: {
  id: string;
  hora: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  servicoPreco: number;
  status: string;
  formaPagamento: FormaPagamento | null;
  alertaHistorico: string | null;
  presencaConfirmada: boolean;
  jaComecou: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const finalizado = ["cancelado", "concluido", "faltou"].includes(status);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
          {hora} — {clienteNome}
        </p>
        <p className="text-xs text-zinc-500">
          {clienteTelefone} · {servicoNome} ·{" "}
          {servicoPreco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
        {(alertaHistorico || (presencaConfirmada && !finalizado)) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {presencaConfirmada && !finalizado && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                Confirmou presença
              </span>
            )}
            {alertaHistorico && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Histórico: {alertaHistorico}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {clienteTelefone && (
          <a
            href={linkWhatsApp(clienteTelefone)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
          >
            WhatsApp
          </a>
        )}

        <select
          disabled={isPending}
          defaultValue={formaPagamento ?? ""}
          onChange={(e) =>
            startTransition(() =>
              definirFormaPagamento(id, e.target.value as FormaPagamento),
            )
          }
          className="rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Forma de pagamento
          </option>
          {(Object.keys(LABEL_FORMA) as FormaPagamento[]).map((f) => (
            <option key={f} value={f}>
              {LABEL_FORMA[f]}
            </option>
          ))}
        </select>

        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {NOME_STATUS[status] ?? status}
        </span>

        {!finalizado && (
          <>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => concluirAgendamento(id))}
              className="text-xs font-medium text-green-700 hover:underline disabled:opacity-50 dark:text-green-400"
            >
              Concluir
            </button>
            {jaComecou && (
              <button
                disabled={isPending}
                onClick={() => startTransition(() => marcarFalta(id))}
                className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-50 dark:text-amber-400"
              >
                Faltou
              </button>
            )}
            <button
              disabled={isPending}
              onClick={() => startTransition(() => cancelarAgendamento(id))}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
