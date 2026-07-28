"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Barbeiro, Servico } from "@/lib/types";

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function NovoAgendamentoForm({
  barbeariaId,
  barbeiros,
  servicos,
}: {
  barbeariaId: string;
  barbeiros: Barbeiro[];
  servicos: Servico[];
}) {
  const router = useRouter();
  const [barbeiroId, setBarbeiroId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [data, setData] = useState(hojeISO());
  const [horarioIso, setHorarioIso] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function buscarSlots(novoBarbeiro: string, novoServico: string, novaData: string) {
    setHorarioIso("");
    if (!novoBarbeiro || !novoServico || !novaData) {
      setSlots([]);
      return;
    }
    setCarregandoSlots(true);
    try {
      const res = await fetch(
        `/api/disponibilidade?barbeiro_id=${novoBarbeiro}&servico_id=${novoServico}&data=${novaData}`,
      );
      const json = await res.json();
      setSlots(json.slots ?? []);
    } finally {
      setCarregandoSlots(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!barbeiroId || !servicoId || !horarioIso || !nome || !whatsapp) return;
    setEnviando(true);
    setErro(null);

    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbearia_id: barbeariaId,
          barbeiro_id: barbeiroId,
          servico_id: servicoId,
          data_hora: horarioIso,
          nome,
          telefone_whatsapp: whatsapp,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErro(json.error ?? "Não foi possível criar o agendamento.");
        if (res.status === 409) await buscarSlots(barbeiroId, servicoId, data);
        return;
      }

      setSucesso(true);
      setTimeout(() => router.push("/admin"), 1200);
    } catch {
      setErro("Não foi possível criar o agendamento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (barbeiros.length === 0 || servicos.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Cadastre pelo menos um barbeiro e um serviço antes de criar um agendamento.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-md flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Barbeiro
        </label>
        <select
          required
          value={barbeiroId}
          onChange={(e) => {
            setBarbeiroId(e.target.value);
            buscarSlots(e.target.value, servicoId, data);
          }}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Escolha o barbeiro
          </option>
          {barbeiros.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Serviço
        </label>
        <select
          required
          value={servicoId}
          onChange={(e) => {
            setServicoId(e.target.value);
            buscarSlots(barbeiroId, e.target.value, data);
          }}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="" disabled>
            Escolha o serviço
          </option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} — {s.duracao_min} min
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Data
        </label>
        <input
          type="date"
          required
          min={hojeISO()}
          value={data}
          onChange={(e) => {
            setData(e.target.value);
            buscarSlots(barbeiroId, servicoId, e.target.value);
          }}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Horário
        </label>
        {carregandoSlots && <p className="text-sm text-zinc-500">Carregando...</p>}
        {!carregandoSlots && barbeiroId && servicoId && slots.length === 0 && (
          <p className="text-sm text-zinc-500">Nenhum horário livre nesse dia.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {slots.map((iso) => (
            <button
              key={iso}
              type="button"
              onClick={() => setHorarioIso(iso)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                horarioIso === iso
                  ? "border-zinc-950 bg-zinc-950 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                  : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              }`}
            >
              {new Date(iso).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Sao_Paulo",
              })}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Cliente
        </label>
        <input
          required
          placeholder="Nome do cliente"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="mb-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          required
          placeholder="WhatsApp (com DDD)"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
      {sucesso && (
        <p className="text-sm text-green-700 dark:text-green-400">Agendamento criado!</p>
      )}

      <button
        type="submit"
        disabled={enviando || !horarioIso}
        className="rounded-full bg-zinc-950 py-2.5 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {enviando ? "Criando..." : "Criar agendamento"}
      </button>
    </form>
  );
}
