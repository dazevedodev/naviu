"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { NOME_STATUS, type FormaPagamento } from "@/lib/types";
import { reais } from "@/lib/financeiro";
import {
  cancelarAgendamento,
  concluirAgendamento,
  marcarFalta,
  reabrirAgendamento,
} from "../actions";
import { BOTAO, BOTAO_CLARO, Iniciais, linkWhatsApp } from "../ui";
import type { ItemAgenda } from "./dados";

const FORMAS: { valor: FormaPagamento; nome: string }[] = [
  { valor: "pix", nome: "PIX" },
  { valor: "cartao", nome: "Cartão" },
  { valor: "dinheiro", nome: "Dinheiro" },
];

export const NOME_FORMA: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  nao_informado: "Não informado",
};

const FUSO = "America/Sao_Paulo";

export function horaDe(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
}

// Cores de cada situação, iguais na agenda e no detalhe.
export const COR_STATUS: Record<string, string> = {
  pendente: "bg-white border-l-navalha",
  confirmado: "bg-white border-l-navalha",
  concluido: "bg-emerald-50 border-l-emerald-600",
  faltou: "bg-amber-50 border-l-amber-500",
  cancelado: "bg-[#F6F1F1] border-l-black/20 opacity-60",
};

// Gaveta com tudo de um horário: quem é, o que vai fazer e o que dá para
// fazer com ele (fechar o atendimento, marcar falta, cancelar).
export function DetalheHorario({
  item,
  barbeiro,
  aoFechar,
}: {
  item: ItemAgenda;
  barbeiro: string;
  aoFechar: () => void;
}) {
  const [pendente, iniciar] = useTransition();
  const [fechando, setFechando] = useState(false);
  const [forma, setForma] = useState<FormaPagamento | null>(item.formaPagamento);
  const [valor, setValor] = useState(String(item.servico.preco).replace(".", ","));
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoFechar]);

  const inicio = new Date(item.inicio);
  const fim = new Date(inicio.getTime() + item.duracao * 60_000);
  const jaComecou = inicio <= new Date();
  const aberto = item.status === "pendente" || item.status === "confirmado";

  function executar(acao: () => Promise<{ error: string | null }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (r.error) setErro(r.error);
      else aoFechar();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 sm:items-stretch sm:justify-end" onClick={aoFechar}>
      <div
        role="dialog"
        aria-label={`Horário de ${item.cliente.nome}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-[28px] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-[28px]"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-aco">
            {NOME_STATUS[item.status] ?? item.status}
            {item.presencaConfirmada && aberto && " · confirmou presença"}
          </p>
          <button onClick={aoFechar} aria-label="Fechar" className="-mr-2 -mt-2 rounded-full px-3 py-1 text-2xl leading-none text-aco hover:bg-[#F6F1F1]">
            ×
          </button>
        </div>

        <p className="mt-2 font-display text-4xl font-semibold tabular-nums text-navalha">
          {horaDe(item.inicio)}
          <span className="text-lg text-aco"> até {horaDe(fim.toISOString())}</span>
        </p>
        <p className="mt-1 text-sm text-aco first-letter:uppercase">
          {inicio.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSO })}
        </p>

        <div className="mt-5 rounded-2xl bg-[#F6F1F1] p-4">
          <p className="font-semibold">{item.servico.nome}</p>
          <p className="text-sm text-aco">
            com {barbeiro} · {reais(item.servico.preco)}
          </p>
        </div>

        <Link
          href={`/admin/clientes/${item.cliente.id}`}
          className="mt-3 flex items-center gap-3 rounded-2xl border border-black/[0.07] p-4 hover:border-tinta"
        >
          <Iniciais nome={item.cliente.nome} />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{item.cliente.nome}</span>
            <span className="block text-sm text-aco">{item.cliente.telefone}</span>
          </span>
          <span aria-hidden className="text-aco">›</span>
        </Link>
        {item.alerta && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Atenção: {item.alerta}</p>
        )}

        {item.cliente.telefone && (
          <a
            href={linkWhatsApp(item.cliente.telefone)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BOTAO_CLARO} mt-3 w-full`}
          >
            Mandar mensagem no WhatsApp
          </a>
        )}

        {item.status === "concluido" && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
            Atendido · {reais(item.valorCobrado ?? item.servico.preco)}
            {item.formaPagamento && ` no ${NOME_FORMA[item.formaPagamento]}`}
          </div>
        )}

        {aberto && !fechando && (
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={() => setFechando(true)} className={`${BOTAO} h-12 w-full`}>
              Fechar atendimento
            </button>
            <div className="grid grid-cols-2 gap-2">
              {jaComecou && (
                <button disabled={pendente} onClick={() => executar(() => marcarFalta(item.id))} className={BOTAO_CLARO}>
                  Faltou
                </button>
              )}
              <button
                disabled={pendente}
                onClick={() => {
                  if (confirm("Cancelar este horário? Quem está na lista de espera do dia é avisado.")) {
                    executar(() => cancelarAgendamento(item.id));
                  }
                }}
                className={`${BOTAO_CLARO} ${jaComecou ? "" : "col-span-2"} text-navalha`}
              >
                Cancelar horário
              </button>
            </div>
          </div>
        )}

        {aberto && fechando && (
          <form
            className="mt-6 flex flex-col gap-4 rounded-2xl border border-black/[0.07] p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!forma) return setErro("Escolha como o cliente pagou.");
              executar(() => concluirAgendamento(item.id, forma, Number(valor.replace(/\./g, "").replace(",", "."))));
            }}
          >
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Como pagou?</legend>
              <div className="grid grid-cols-3 gap-2">
                {FORMAS.map((f) => (
                  <button
                    key={f.valor}
                    type="button"
                    aria-pressed={forma === f.valor}
                    onClick={() => setForma(f.valor)}
                    className={`h-11 rounded-xl text-sm font-semibold ${
                      forma === f.valor ? "bg-tinta text-white" : "bg-[#F6F1F1] text-tinta hover:bg-rosado/50"
                    }`}
                  >
                    {f.nome}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Valor cobrado</span>
              <span className="flex h-11 items-center rounded-xl border border-black/10 px-3 focus-within:border-navalha">
                <span className="text-aco">R$</span>
                <input
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ""))}
                  className="ml-2 min-w-0 flex-1 bg-transparent font-semibold tabular-nums outline-none"
                />
              </span>
              <span className="text-xs text-aco">Mude se teve desconto ou algo a mais.</span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFechando(false)} className={`${BOTAO_CLARO} flex-1`}>
                Voltar
              </button>
              <button type="submit" disabled={pendente} className={`${BOTAO} flex-1`}>
                {pendente ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        )}

        {(item.status === "concluido" || item.status === "faltou") && (
          <button
            disabled={pendente}
            onClick={() => executar(() => reabrirAgendamento(item.id))}
            className="mt-4 w-full text-center text-sm font-medium text-aco underline-offset-4 hover:text-tinta hover:underline"
          >
            Marquei errado, desfazer
          </button>
        )}

        {erro && <p className="mt-3 text-sm text-navalha">{erro}</p>}
      </div>
    </div>
  );
}
