"use client";

import { useState, useTransition } from "react";
import { PLANOS, formatarReais, type PlanoId } from "@/lib/planos";
import {
  assinar,
  cancelarAssinatura,
  pagarAgora,
  trocarForma,
  trocarPlano,
} from "./actions";

type Forma = "cartao" | "pix_boleto";

type Props = {
  temAssinatura: boolean; // assinatura viva no Asaas (não cancelada)
  precisaDocumento: boolean; // ainda não tem cliente no Asaas
  planoAtual: PlanoId;
  formaAtual: Forma;
  faturaUrl: string | null;
};

const CAMPO =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";
const BOTAO =
  "w-full rounded-full bg-zinc-950 py-2.5 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200";
const BOTAO_SECUNDARIO =
  "rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900";

function EscolhaForma({ padrao }: { padrao: Forma }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Como você quer pagar
      </legend>
      <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 has-[:checked]:border-zinc-950 dark:border-zinc-800 dark:has-[:checked]:border-zinc-50">
        <input type="radio" name="forma" value="cartao" defaultChecked={padrao === "cartao"} className="mt-1" />
        <span className="text-sm">
          <span className="block font-medium text-zinc-950 dark:text-zinc-50">Cartão de crédito</span>
          <span className="text-zinc-500">Cobra sozinho todo mês. Você não precisa lembrar.</span>
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 has-[:checked]:border-zinc-950 dark:border-zinc-800 dark:has-[:checked]:border-zinc-50">
        <input type="radio" name="forma" value="pix_boleto" defaultChecked={padrao === "pix_boleto"} className="mt-1" />
        <span className="text-sm">
          <span className="block font-medium text-zinc-950 dark:text-zinc-50">Pix ou boleto</span>
          <span className="text-zinc-500">Chega uma fatura por e-mail todo mês pra você pagar.</span>
        </span>
      </label>
    </fieldset>
  );
}

export function PainelAssinatura(props: Props) {
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function rodar(
    acao: () => Promise<{ error: string | null; faturaUrl?: string | null }>,
    sucesso?: string,
  ) {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      const r = await acao();
      if (r.error) return setError(r.error);
      // Fatura do Asaas: a pessoa paga lá (cartão, Pix ou boleto) e volta.
      if (r.faturaUrl) {
        window.location.href = r.faturaUrl;
        return;
      }
      if (sucesso) setAviso(sucesso);
    });
  }

  const mensagens = (
    <>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {aviso && <p className="text-sm text-green-700 dark:text-green-400">{aviso}</p>}
    </>
  );

  if (!props.temAssinatura) {
    return (
      <form
        action={(formData) => rodar(() => assinar(formData))}
        className="flex max-w-2xl flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Escolha o plano
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLANOS.map((plano) => (
              <label
                key={plano.id}
                className="flex cursor-pointer flex-col rounded-xl border border-zinc-200 p-4 has-[:checked]:border-zinc-950 has-[:checked]:ring-1 has-[:checked]:ring-zinc-950 dark:border-zinc-800 dark:has-[:checked]:border-zinc-50 dark:has-[:checked]:ring-zinc-50"
              >
                <span className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-950 dark:text-zinc-50">{plano.nome}</span>
                  <input
                    type="radio"
                    name="plano"
                    value={plano.id}
                    defaultChecked={plano.id === props.planoAtual}
                  />
                </span>
                <span className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {formatarReais(plano.valor)}
                  <span className="text-sm font-normal text-zinc-500">/mês</span>
                </span>
                <span className="mt-1 text-sm text-zinc-500">
                  {plano.limiteBarbeiros === 1 ? "1 barbeiro" : `Até ${plano.limiteBarbeiros} barbeiros`}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <EscolhaForma padrao={props.formaAtual} />

        {props.precisaDocumento && (
          <div>
            <label htmlFor="cpf_cnpj" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              CPF ou CNPJ de quem paga
            </label>
            <input
              id="cpf_cnpj"
              name="cpf_cnpj"
              inputMode="numeric"
              autoComplete="off"
              required
              placeholder="Só números"
              className={CAMPO}
            />
            <p className="mt-1 text-xs text-zinc-500">
              O Asaas, que processa o pagamento, pede pra emitir a cobrança.
            </p>
          </div>
        )}

        {mensagens}

        <button type="submit" disabled={isPending} className={BOTAO}>
          {isPending ? "Abrindo pagamento..." : "Assinar e ir pro pagamento"}
        </button>
      </form>
    );
  }

  const outroPlano = PLANOS.find((p) => p.id !== props.planoAtual)!;
  const outraForma: Forma = props.formaAtual === "cartao" ? "pix_boleto" : "cartao";

  return (
    <div className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      {props.faturaUrl && (
        <button type="button" disabled={isPending} onClick={() => rodar(pagarAgora)} className={BOTAO}>
          {isPending ? "Abrindo..." : "Pagar fatura em aberto"}
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          className={BOTAO_SECUNDARIO}
          onClick={() => {
            const fd = new FormData();
            fd.set("plano", outroPlano.id);
            rodar(() => trocarPlano(fd), `Pronto, agora você está no plano ${outroPlano.nome}.`);
          }}
        >
          Mudar pro plano {outroPlano.nome} ({formatarReais(outroPlano.valor)}/mês)
        </button>
        <button
          type="button"
          disabled={isPending}
          className={BOTAO_SECUNDARIO}
          onClick={() => {
            const fd = new FormData();
            fd.set("forma", outraForma);
            rodar(
              () => trocarForma(fd),
              outraForma === "cartao"
                ? "Pronto, as próximas cobranças vão pro cartão."
                : "Pronto, as próximas faturas vêm por Pix ou boleto.",
            );
          }}
        >
          {outraForma === "cartao" ? "Pagar com cartão" : "Pagar com Pix ou boleto"}
        </button>
      </div>

      {mensagens}

      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Cancelar a assinatura? Você continua usando até o fim do período já pago.")) return;
          rodar(cancelarAssinatura, "Assinatura cancelada. Você usa até o fim do período pago.");
        }}
        className="self-start text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        Cancelar assinatura
      </button>
    </div>
  );
}
