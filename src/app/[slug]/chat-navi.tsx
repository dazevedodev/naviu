"use client";

import { useEffect, useRef, useState } from "react";
import { NaviAvatar } from "@/components/navi-avatar";
import { clienteLembrado, lembrarCliente, type ClienteLembrado } from "./cliente-lembrado";

type Bolha = { autor: "cliente" | "navi"; texto: string; hora: string };

type Agendamento = {
  servico: string;
  barbeiro: string;
  data: string;
  hora: string;
  cliente?: ClienteLembrado;
};

type Conversa = { bolhas: Bolha[]; historico: unknown[]; agendamento: Agendamento | null };

const VAZIA: Conversa = { bolhas: [], historico: [], agendamento: null };

function horaAgora() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// A conversa fica guardada na aba (sessionStorage): se o cliente for ver um
// serviço e voltar, a Navi continua de onde parou.
function chaveDaConversa(slug: string) {
  return `naviu:chat:${slug}`;
}

function conversaSalva(slug: string): Conversa {
  try {
    const salva = sessionStorage.getItem(chaveDaConversa(slug));
    return salva ? JSON.parse(salva) : VAZIA;
  } catch {
    return VAZIA;
  }
}

// Chat com a Navi, a atendente virtual (agente de IA). Fica num balão no canto
// da tela. O histórico completo, com as chamadas de ferramenta, vive aqui no
// navegador em `historico` e vai inteiro a cada mensagem; `bolhas` é só o que
// aparece na tela.
export function ChatNavi({ slug, barbearia }: { slug: string; barbearia: string }) {
  const [aberto, setAberto] = useState(false);
  // Lidos do navegador já na criação: nada disso aparece antes do chat abrir,
  // então o HTML do servidor e o do navegador continuam iguais.
  const [conversa, setConversa] = useState<Conversa>(() => conversaSalva(slug));
  const [cliente, setCliente] = useState<ClienteLembrado | null>(clienteLembrado);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(chaveDaConversa(slug), JSON.stringify(conversa));
    } catch {}
  }, [slug, conversa]);

  useEffect(() => {
    if (!aberto) return;
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [aberto, conversa.bolhas.length, enviando]);

  useEffect(() => {
    if (!aberto) return;
    campoRef.current?.focus();
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);

  const primeiroNome = cliente?.nome.split(" ")[0];
  const saudacao = primeiroNome
    ? `Oi, ${primeiroNome}! Que bom te ver de novo. Quer marcar, remarcar ou desmarcar um horário?`
    : `Oi! Eu sou a Navi, atendente virtual da ${barbearia}. Marco seu horário aqui mesmo, é só me dizer o serviço e quando.`;
  const sugestoes = primeiroNome
    ? ["Ver meus horários", "Quero remarcar", "Marcar outro horário"]
    : ["Quero cortar amanhã", "Quanto custa?", "Tem horário sábado?"];

  async function enviar(mensagem: string) {
    const limpa = mensagem.trim();
    if (!limpa || enviando) return;

    const antes = conversa;
    const novoHistorico = [...conversa.historico, { role: "user", content: limpa }];
    setConversa({
      ...conversa,
      bolhas: [...conversa.bolhas, { autor: "cliente", texto: limpa, hora: horaAgora() }],
    });
    setTexto("");
    setErro(null);
    setEnviando(true);

    try {
      const res = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          mensagens: novoHistorico,
          ...(cliente ? { cliente: { nome: cliente.nome, telefone: cliente.telefone } } : {}),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErro(json.error ?? "Não consegui responder agora.");
        // Mensagem não processada: volta para o campo para tentar de novo.
        setConversa(res.status === 400 || res.status === 413 ? VAZIA : antes);
        setTexto(limpa);
        return;
      }

      const agendamento: Agendamento | null = json.agendamento ?? null;
      if (agendamento?.cliente) {
        lembrarCliente(agendamento.cliente);
        setCliente(agendamento.cliente);
      }
      setConversa((c) => ({
        historico: json.mensagens,
        bolhas: [...c.bolhas, { autor: "navi", texto: json.resposta, hora: horaAgora() }],
        agendamento: agendamento ?? c.agendamento,
      }));
    } catch {
      setErro("Sem conexão. Tente de novo.");
      setConversa(antes);
      setTexto(limpa);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 text-left text-tinta shadow-[0_14px_40px_-12px_rgba(28,20,21,0.55)] ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta sm:bottom-6 sm:right-6"
        >
          <span className="relative">
            <NaviAvatar className="h-12 w-12" />
            <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight">Fale com a Navi</span>
            <span className="block text-xs text-aco">Marque pelo chat</span>
          </span>
        </button>
      )}

      {aberto && (
        <div
          role="dialog"
          aria-label="Conversa com a Navi"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white text-tinta sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-3rem))] sm:w-[400px] sm:rounded-[28px] sm:shadow-[0_30px_80px_-20px_rgba(28,20,21,0.6)] sm:ring-1 sm:ring-black/5"
        >
          <header className="flex items-center gap-3 bg-navalha px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
            <span className="rounded-full bg-white p-0.5">
              <NaviAvatar className="h-11 w-11" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-semibold leading-tight">Navi</p>
              <p className="truncate text-xs text-rosado">
                Atendente virtual · {barbearia}
              </p>
            </div>
            <button
              onClick={() => setAberto(false)}
              aria-label="Fechar conversa"
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            >
              ×
            </button>
          </header>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#F6F1F1] px-3 py-4" aria-live="polite">
            <BolhaNavi texto={saudacao} />

            {conversa.bolhas.length === 0 && (
              <div className="mt-1 flex flex-wrap gap-2 pl-10">
                {sugestoes.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="rounded-full border border-navalha/30 bg-white px-3 py-1.5 text-sm font-medium text-navalha hover:border-navalha"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {conversa.bolhas.map((b, i) =>
              b.autor === "navi" ? (
                <BolhaNavi key={i} texto={b.texto} hora={b.hora} />
              ) : (
                <div
                  key={i}
                  className="max-w-[80%] self-end whitespace-pre-line rounded-2xl rounded-br-md bg-navalha px-3.5 py-2 text-[15px] leading-snug text-white"
                >
                  {b.texto}
                  <span className="ml-2 align-bottom text-[10px] text-rosado">{b.hora}</span>
                </div>
              ),
            )}

            {enviando && (
              <div className="flex items-end gap-2">
                <NaviAvatar className="h-8 w-8 shrink-0" />
                <span className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3" aria-label="Navi está digitando">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="navi-ponto h-1.5 w-1.5 rounded-full bg-aco"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              </div>
            )}

            {conversa.agendamento && (
              <div className="ml-10 mt-1 rounded-2xl bg-tinta p-4 text-sm text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rosado">
                  Horário marcado
                </p>
                <p className="mt-1 font-semibold">
                  {conversa.agendamento.servico} com {conversa.agendamento.barbeiro}
                </p>
                <p className="font-display text-lg font-semibold">
                  {conversa.agendamento.data} às {conversa.agendamento.hora}
                </p>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {erro && <p className="bg-[#F6F1F1] px-4 pb-2 text-sm text-navalha">{erro}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex gap-2 border-t border-black/[0.07] bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <input
              ref={campoRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={600}
              placeholder="Escreva sua mensagem"
              aria-label="Sua mensagem"
              className="h-11 min-w-0 flex-1 rounded-full bg-[#F6F1F1] px-4 text-base outline-none placeholder:text-aco/70 focus:ring-2 focus:ring-navalha/40"
            />
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              aria-label="Enviar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navalha text-white hover:bg-navalha-escuro disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path d="M3 11.5 20 4l-7.5 17-2.2-7.3L3 11.5Z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function BolhaNavi({ texto, hora }: { texto: string; hora?: string }) {
  return (
    <div className="flex items-end gap-2">
      <NaviAvatar className="h-8 w-8 shrink-0" />
      <p className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[15px] leading-snug">
        {texto}
        {hora && <span className="ml-2 align-bottom text-[10px] text-aco">{hora}</span>}
      </p>
    </div>
  );
}
