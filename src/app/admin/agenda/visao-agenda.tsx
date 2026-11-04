"use client";

import Link from "next/link";
import { useState } from "react";
import { Iniciais, Vazio } from "../ui";
import type { ItemAgenda } from "./dados";
import { COR_STATUS, DetalheHorario, horaDe } from "./detalhe-horario";

type Barbeiro = { id: string; nome: string; foto_url: string | null };

// Altura de um minuto na linha do tempo do dia: 1 hora = 96px.
const PX_MINUTO = 1.6;
const FUSO = "America/Sao_Paulo";

function minutosDoDia(iso: string) {
  const [h, m] = horaDe(iso).split(":").map(Number);
  return h * 60 + m;
}

// Dia: uma coluna por barbeiro, com os horários desenhados no tamanho da
// duração de cada serviço, como numa agenda de papel.
export function AgendaDia({
  barbeiros,
  itens,
  faixa,
  agoraMin,
}: {
  barbeiros: Barbeiro[];
  itens: ItemAgenda[];
  faixa: { inicio: number; fim: number }; // minutos do dia
  agoraMin: number | null; // só quando o dia mostrado é hoje
}) {
  const [aberto, setAberto] = useState<ItemAgenda | null>(null);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const visiveis = itens.filter((i) => mostrarCancelados || i.status !== "cancelado");
  const cancelados = itens.length - itens.filter((i) => i.status !== "cancelado").length;
  const altura = (faixa.fim - faixa.inicio) * PX_MINUTO;
  const horas: number[] = [];
  for (let m = Math.ceil(faixa.inicio / 60) * 60; m <= faixa.fim; m += 60) horas.push(m);
  const nome = (id: string) => barbeiros.find((b) => b.id === id)?.nome ?? "";

  if (barbeiros.length === 0) {
    return <Vazio>Cadastre um barbeiro para começar a agenda.</Vazio>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-3xl bg-white">
        <div className="min-w-fit" style={{ minWidth: 56 + barbeiros.length * 180 }}>
          {/* Cabeçalho com os barbeiros */}
          <div className="sticky top-0 z-10 flex border-b border-black/[0.07] bg-white">
            <div className="w-14 shrink-0" />
            {barbeiros.map((b) => {
              const n = visiveis.filter((i) => i.barbeiroId === b.id && i.status !== "cancelado").length;
              return (
                <div key={b.id} className="flex min-w-[180px] flex-1 items-center gap-2 border-l border-black/[0.07] px-3 py-3">
                  <Iniciais nome={b.nome} foto={b.foto_url} tamanho="h-8 w-8" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{b.nome}</span>
                    <span className="block text-xs text-aco">{n === 1 ? "1 horário" : `${n} horários`}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Linha do tempo */}
          <div className="relative flex" style={{ height: altura }}>
            <div className="relative w-14 shrink-0">
              {horas.map((m) => (
                <span
                  key={m}
                  className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-aco"
                  style={{ top: (m - faixa.inicio) * PX_MINUTO }}
                >
                  {String(m / 60).padStart(2, "0")}h
                </span>
              ))}
            </div>

            {barbeiros.map((b) => (
              <div key={b.id} className="relative min-w-[180px] flex-1 border-l border-black/[0.07]">
                {horas.map((m) => (
                  <div
                    key={m}
                    className="absolute inset-x-0 border-t border-black/[0.05]"
                    style={{ top: (m - faixa.inicio) * PX_MINUTO }}
                  />
                ))}
                {visiveis
                  .filter((i) => i.barbeiroId === b.id)
                  .map((i) => {
                    const topo = (minutosDoDia(i.inicio) - faixa.inicio) * PX_MINUTO;
                    const alturaBloco = Math.max(i.duracao * PX_MINUTO - 3, 26);
                    return (
                      <button
                        key={i.id}
                        onClick={() => setAberto(i)}
                        className={`absolute inset-x-1.5 overflow-hidden rounded-xl border border-black/[0.06] border-l-4 px-2.5 py-1.5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-navalha ${COR_STATUS[i.status] ?? COR_STATUS.confirmado}`}
                        style={{ top: topo + 1, height: alturaBloco }}
                      >
                        <span className="block truncate text-xs font-semibold tabular-nums text-aco">
                          {horaDe(i.inicio)} · {i.servico.nome}
                        </span>
                        <span className={`block truncate text-sm font-semibold ${i.status === "cancelado" ? "line-through" : ""}`}>
                          {i.alerta && <span className="mr-1 text-amber-600" title={i.alerta}>●</span>}
                          {i.cliente.nome}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))}

            {agoraMin !== null && agoraMin >= faixa.inicio && agoraMin <= faixa.fim && (
              <div
                aria-hidden
                className="pointer-events-none absolute left-12 right-0 z-[5] flex items-center"
                style={{ top: (agoraMin - faixa.inicio) * PX_MINUTO }}
              >
                <span className="h-2.5 w-2.5 -translate-x-1 rounded-full bg-navalha" />
                <span className="h-0.5 flex-1 bg-navalha" />
              </div>
            )}
          </div>
        </div>
      </div>

      {cancelados > 0 && (
        <button
          onClick={() => setMostrarCancelados((v) => !v)}
          className="mt-3 text-sm font-medium text-aco underline-offset-4 hover:text-tinta hover:underline"
        >
          {mostrarCancelados
            ? "Esconder cancelados"
            : cancelados === 1
              ? "Mostrar 1 cancelado"
              : `Mostrar ${cancelados} cancelados`}
        </button>
      )}

      {aberto && <DetalheHorario item={aberto} barbeiro={nome(aberto.barbeiroId)} aoFechar={() => setAberto(null)} />}
    </>
  );
}

// Lista simples de horários (tela de início): toque abre o mesmo detalhe.
export function ListaHorarios({ barbeiros, itens }: { barbeiros: Barbeiro[]; itens: ItemAgenda[] }) {
  const [aberto, setAberto] = useState<ItemAgenda | null>(null);
  const nome = (id: string) => barbeiros.find((b) => b.id === id)?.nome ?? "";
  return (
    <>
      <ul className="flex flex-col gap-2">
        {itens.map((i) => (
          <li key={i.id}>
            <button
              onClick={() => setAberto(i)}
              className={`flex w-full items-center gap-4 rounded-2xl border border-black/[0.06] border-l-4 px-4 py-3 text-left hover:shadow-sm ${COR_STATUS[i.status] ?? COR_STATUS.confirmado}`}
            >
              <span className="font-display text-lg font-semibold tabular-nums">{horaDe(i.inicio)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {i.alerta && <span className="mr-1 text-amber-600" title={i.alerta}>●</span>}
                  {i.cliente.nome}
                </span>
                <span className="block truncate text-sm text-aco">
                  {i.servico.nome}
                  {barbeiros.length > 1 && ` · ${nome(i.barbeiroId)}`}
                </span>
              </span>
              {i.presencaConfirmada && (
                <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 sm:inline">
                  Confirmou
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {aberto && <DetalheHorario item={aberto} barbeiro={nome(aberto.barbeiroId)} aoFechar={() => setAberto(null)} />}
    </>
  );
}

// Semana: sete dias lado a lado, cada um com a lista dos horários.
export function AgendaSemana({
  dias,
  hoje,
  barbeiros,
  itens,
}: {
  dias: string[];
  hoje: string;
  barbeiros: Barbeiro[];
  itens: ItemAgenda[];
}) {
  const [aberto, setAberto] = useState<ItemAgenda | null>(null);
  const nome = (id: string) => barbeiros.find((b) => b.id === id)?.nome ?? "";
  const doDia = (dia: string) =>
    itens.filter(
      (i) =>
        i.status !== "cancelado" &&
        new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(i.inicio)) === dia,
    );

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-7">
        {dias.map((dia) => {
          const lista = doDia(dia);
          const d = new Date(`${dia}T12:00:00Z`);
          return (
            <section key={dia} className={`rounded-3xl bg-white p-3 ${dia === hoje ? "ring-2 ring-navalha" : ""}`}>
              <Link
                href={`/admin/agenda?data=${dia}`}
                className="mb-2 flex items-baseline justify-between gap-2 rounded-xl px-1 hover:text-navalha"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-aco">
                  {d.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "")}
                </span>
                <span className="font-display text-xl font-semibold">{d.getUTCDate()}</span>
              </Link>
              {lista.length === 0 ? (
                <p className="px-1 pb-1 text-xs text-aco">Livre</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {lista.map((i) => (
                    <li key={i.id}>
                      <button
                        onClick={() => setAberto(i)}
                        className={`w-full rounded-xl border border-black/[0.06] border-l-4 px-2 py-1.5 text-left hover:shadow-sm ${COR_STATUS[i.status] ?? COR_STATUS.confirmado}`}
                      >
                        <span className="block text-xs font-semibold tabular-nums">
                          {horaDe(i.inicio)}
                          {barbeiros.length > 1 && <span className="font-normal text-aco"> · {nome(i.barbeiroId)}</span>}
                        </span>
                        <span className="block truncate text-sm">{i.cliente.nome}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {aberto && <DetalheHorario item={aberto} barbeiro={nome(aberto.barbeiroId)} aoFechar={() => setAberto(null)} />}
    </>
  );
}
