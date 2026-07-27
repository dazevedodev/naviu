"use client";

import { useMemo, useState } from "react";
import type { Barbearia, Barbeiro, Servico } from "@/lib/types";

type Passo = "servico" | "barbeiro" | "data" | "horario" | "dados" | "confirmado";

type SlotComBarbeiro = { iso: string; barbeiroId: string };

const QUALQUER = "qualquer";

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function BookingFlow({
  barbearia,
  barbeiros,
  servicos,
}: {
  barbearia: Barbearia;
  barbeiros: Barbeiro[];
  servicos: Servico[];
}) {
  const [passo, setPasso] = useState<Passo>("servico");
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<string | null>(null);
  const [data, setData] = useState(hojeISO());
  const [slots, setSlots] = useState<SlotComBarbeiro[]>([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [slotEscolhido, setSlotEscolhido] = useState<SlotComBarbeiro | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ id: string; status: string } | null>(null);

  const servico = useMemo(
    () => servicos.find((s) => s.id === servicoId) ?? null,
    [servicos, servicoId],
  );

  async function buscarSlots(novaData: string, barbeiroId: string | null) {
    if (!servicoId) return;
    setCarregandoSlots(true);
    setErro(null);

    const candidatos =
      barbeiroId && barbeiroId !== QUALQUER
        ? [barbeiroId]
        : barbeiros.map((b) => b.id);

    try {
      const respostas = await Promise.all(
        candidatos.map(async (bId) => {
          const res = await fetch(
            `/api/disponibilidade?barbeiro_id=${bId}&servico_id=${servicoId}&data=${novaData}`,
          );
          const json = await res.json();
          return (json.slots as string[]).map((iso) => ({ iso, barbeiroId: bId }));
        }),
      );

      const todos = respostas.flat();
      const vistos = new Set<string>();
      const unicos = todos.filter((s) => {
        if (vistos.has(s.iso)) return false;
        vistos.add(s.iso);
        return true;
      });
      unicos.sort((a, b) => a.iso.localeCompare(b.iso));
      setSlots(unicos);
    } catch {
      setErro("Não foi possível carregar os horários. Tente novamente.");
    } finally {
      setCarregandoSlots(false);
    }
  }

  async function confirmarAgendamento() {
    if (!servicoId || !slotEscolhido || !nome || !whatsapp) return;
    setEnviando(true);
    setErro(null);

    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbearia_id: barbearia.id,
          barbeiro_id: slotEscolhido.barbeiroId,
          servico_id: servicoId,
          data_hora: slotEscolhido.iso,
          nome,
          telefone_whatsapp: whatsapp,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErro(json.error ?? "Não foi possível concluir o agendamento.");
        if (res.status === 409) await buscarSlots(data, barbeiroSelecionado);
        return;
      }

      setResultado(json);
      setPasso("confirmado");
    } catch {
      setErro("Não foi possível concluir o agendamento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (servicos.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500">
        Essa barbearia ainda não cadastrou serviços disponíveis.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      {passo === "servico" && (
        <div className="flex flex-col gap-2">
          <h2 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Escolha o serviço
          </h2>
          {servicos.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setServicoId(s.id);
                setPasso("barbeiro");
              }}
              className="flex items-center justify-between rounded-xl border border-zinc-200 p-3 text-left text-sm hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <span>{s.nome}</span>
              <span className="text-zinc-500">
                {s.duracao_min} min ·{" "}
                {s.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </button>
          ))}
        </div>
      )}

      {passo === "barbeiro" && (
        <div className="flex flex-col gap-2">
          <h2 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Escolha o barbeiro
          </h2>
          <button
            onClick={() => {
              setBarbeiroSelecionado(QUALQUER);
              setPasso("data");
              buscarSlots(data, QUALQUER);
            }}
            className="rounded-xl border border-zinc-200 p-3 text-left text-sm hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            Qualquer um disponível
          </button>
          {barbeiros.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setBarbeiroSelecionado(b.id);
                setPasso("data");
                buscarSlots(data, b.id);
              }}
              className="rounded-xl border border-zinc-200 p-3 text-left text-sm hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              {b.nome}
            </button>
          ))}
          <button
            onClick={() => setPasso("servico")}
            className="mt-2 text-left text-xs text-zinc-500 hover:underline"
          >
            ← Voltar
          </button>
        </div>
      )}

      {passo === "data" && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Escolha a data
          </h2>
          <input
            type="date"
            min={hojeISO()}
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              buscarSlots(e.target.value, barbeiroSelecionado);
            }}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />

          <h3 className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Horários disponíveis
          </h3>
          {carregandoSlots && <p className="text-sm text-zinc-500">Carregando...</p>}
          {!carregandoSlots && slots.length === 0 && (
            <p className="text-sm text-zinc-500">Nenhum horário livre nesse dia.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <button
                key={s.iso + s.barbeiroId}
                onClick={() => {
                  setSlotEscolhido(s);
                  setPasso("dados");
                }}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                {new Date(s.iso).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPasso("barbeiro")}
            className="mt-2 text-left text-xs text-zinc-500 hover:underline"
          >
            ← Voltar
          </button>
        </div>
      )}

      {passo === "dados" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirmarAgendamento();
          }}
          className="flex flex-col gap-3"
        >
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Seus dados
          </h2>
          <p className="text-xs text-zinc-500">
            {servico?.nome} —{" "}
            {slotEscolhido &&
              new Date(slotEscolhido.iso).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
          </p>

          <input
            required
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            required
            placeholder="WhatsApp (com DDD)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />

          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="rounded-full bg-zinc-950 py-2.5 text-sm font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
          >
            {enviando ? "Agendando..." : "Confirmar agendamento"}
          </button>
          <button
            type="button"
            onClick={() => setPasso("data")}
            className="text-left text-xs text-zinc-500 hover:underline"
          >
            ← Voltar
          </button>
        </form>
      )}

      {passo === "confirmado" && resultado && slotEscolhido && (
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {resultado.status === "aguardando_sinal"
              ? "Quase lá!"
              : "Agendamento confirmado!"}
          </h2>

          <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium text-zinc-950 dark:text-zinc-50">{servico?.nome}</p>
            <p className="text-zinc-600 dark:text-zinc-400">
              com {barbeiros.find((b) => b.id === slotEscolhido.barbeiroId)?.nome}
            </p>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              {new Date(slotEscolhido.iso).toLocaleString("pt-BR", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
            {barbearia.endereco && (
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">{barbearia.endereco}</p>
            )}
          </div>

          {resultado.status === "aguardando_sinal" ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Falta pagar o sinal via PIX para garantir seu horário. (Cobrança
              PIX ainda não integrada nesta versão.)
            </p>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Te esperamos! Você vai receber a confirmação pelo WhatsApp.
            </p>
          )}
          <a
            href={`/api/agendamentos/${resultado.id}/calendario.ics`}
            className="text-sm font-medium text-zinc-950 underline dark:text-zinc-50"
          >
            Adicionar à agenda
          </a>
        </div>
      )}
    </div>
  );
}
