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
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full border-2 border-white/70 text-base font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-navalha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Agendar conversando
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white text-tinta shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between gap-3 bg-tinta px-4 py-3 text-white">
        <div>
          <p className="font-display text-sm font-semibold">Recepção virtual</p>
          <p className="text-xs text-white/60">Diga o serviço e quando. Eu vejo a agenda e marco.</p>
        </div>
        <button
          onClick={() => setAberto(false)}
          className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25"
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
                className="rounded-full border border-black/10 px-3 py-2 text-sm text-tinta hover:border-navalha"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {bolhas.map((b, i) => (
          <p
            key={i}
            className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug ${
              b.autor === "cliente"
                ? "self-end rounded-br-md bg-navalha text-white"
                : "self-start rounded-bl-md bg-[#F6F1F1] text-tinta"
            }`}
          >
            {b.texto}
          </p>
        ))}

        {enviando && (
          <p className="self-start rounded-2xl rounded-bl-md bg-[#F6F1F1] px-3.5 py-2.5 text-sm text-aco">
            Vendo a agenda…
          </p>
        )}

        {agendamento && (
          <div className="mt-1 rounded-2xl bg-tinta p-4 text-sm text-white">
            <p className="font-semibold">Horário marcado</p>
            <p>
              {agendamento.servico} com {agendamento.barbeiro}, {agendamento.data} às{" "}
              {agendamento.hora}
            </p>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {erro && <p className="px-4 pb-2 text-sm text-navalha">{erro}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="flex gap-2 border-t border-black/10 p-3"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={600}
          placeholder="Quero cortar sexta à tarde"
          aria-label="Sua mensagem"
          className="h-11 min-w-0 flex-1 rounded-full border border-black/10 bg-[#F6F1F1] px-4 text-base outline-none placeholder:text-aco/70 focus:border-navalha focus:bg-white"
        />
        <button
          type="submit"
          disabled={enviando}
          className="h-11 shrink-0 rounded-full bg-navalha px-5 text-sm font-semibold text-white hover:bg-navalha-escuro disabled:opacity-60"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
