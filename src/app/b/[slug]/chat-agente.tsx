"use client";

import { useEffect, useRef, useState } from "react";

type Bolha = { autor: "cliente" | "agente"; texto: string };

type Agendamento = { servico: string; barbeiro: string; data: string; hora: string };

const SUGESTOES = ["Quero cortar sexta à tarde", "Tem horário amanhã de manhã?"];

// Chat com a recepção virtual (agente de IA). O histórico completo da
// conversa, com as chamadas de ferramenta, fica aqui no navegador em
// `historico` e vai inteiro a cada mensagem; `bolhas` é só o que aparece na tela.
export function ChatAgente({ slug }: { slug: string }) {
  const [aberto, setAberto] = useState(false);
  const [bolhas, setBolhas] = useState<Bolha[]>([]);
  const [historico, setHistorico] = useState<unknown[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "nearest" });
  }, [bolhas, enviando]);

  async function enviar(mensagem: string) {
    const limpa = mensagem.trim();
    if (!limpa || enviando) return;

    const novoHistorico = [...historico, { role: "user", content: limpa }];
    setBolhas((b) => [...b, { autor: "cliente", texto: limpa }]);
    setTexto("");
    setErro(null);
    setEnviando(true);

    try {
      const res = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, mensagens: novoHistorico }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErro(json.error ?? "Não consegui responder agora.");
        // Mensagem não processada: some da tela para o cliente tentar de novo.
        setBolhas((b) => b.slice(0, -1));
        setTexto(limpa);
        if (res.status === 400 || res.status === 413) {
          setHistorico([]);
          setBolhas([]);
        }
        return;
      }

      setHistorico(json.mensagens);
      setBolhas((b) => [...b, { autor: "agente", texto: json.resposta }]);
      if (json.agendamento) setAgendamento(json.agendamento);
    } catch {
      setErro("Sem conexão. Tente de novo.");
      setBolhas((b) => b.slice(0, -1));
      setTexto(limpa);
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
      >
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--cor-marca)" }}
        />
        Agendar conversando
      </button>
    );
  }

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Recepção virtual</p>
          <p className="text-xs text-zinc-500">Diga o que quer e quando. Eu vejo a agenda e marco.</p>
        </div>
        <button
          onClick={() => setAberto(false)}
          className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Fechar
        </button>
      </div>

      <div className="flex max-h-96 min-h-40 flex-col gap-2 overflow-y-auto px-4 py-4">
        {bolhas.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                onClick={() => enviar(s)}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {bolhas.map((b, i) => (
          <p
            key={i}
            className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${
              b.autor === "cliente"
                ? "self-end text-white"
                : "self-start bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
            }`}
            style={b.autor === "cliente" ? { backgroundColor: "var(--cor-marca)" } : undefined}
          >
            {b.texto}
          </p>
        ))}

        {enviando && (
          <p className="self-start rounded-2xl bg-zinc-100 px-3.5 py-2 text-sm text-zinc-500 dark:bg-zinc-900">
            Vendo a agenda…
          </p>
        )}

        {agendamento && (
          <div className="mt-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            <p className="font-semibold">Horário marcado</p>
            <p>
              {agendamento.servico} com {agendamento.barbeiro}, {agendamento.data} às{" "}
              {agendamento.hora}
            </p>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {erro && <p className="px-4 pb-2 text-xs text-red-600">{erro}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={600}
          placeholder="Quero cortar sexta à tarde"
          aria-label="Sua mensagem"
          className="h-10 min-w-0 flex-1 rounded-full border border-zinc-300 bg-transparent px-4 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={enviando}
          className="h-10 shrink-0 rounded-full px-4 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: "var(--cor-marca)" }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
