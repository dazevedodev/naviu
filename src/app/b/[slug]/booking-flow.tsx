"use client";

import { useMemo, useState } from "react";
import { RelogioNaviu } from "@/components/relogio-naviu";
import type { Barbearia, Barbeiro, Servico } from "@/lib/types";

type Passo = "servico" | "barbeiro" | "data" | "dados" | "confirmado";

type SlotComBarbeiro = { iso: string; barbeiroId: string };

const QUALQUER = "qualquer";

const FUSO_BRASILIA = "America/Sao_Paulo";

// Quantos dias aparecem na fileira de datas.
const DIAS_VISIVEIS = 21;

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Data de "hoje" no fuso de Brasília, não no fuso do dispositivo do
// visitante — o que importa aqui é o dia da barbearia, não de onde o
// cliente está acessando.
function hojeISO() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASILIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const obter = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${obter("year")}-${obter("month")}-${obter("day")}`;
}

// Próximos dias a partir de hoje, como datas-calendário (sem fuso).
function proximosDias(inicio: string) {
  return Array.from({ length: DIAS_VISIVEIS }, (_, i) => {
    const d = new Date(`${inicio}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      semana: i === 0 ? "hoje" : SEMANA[d.getUTCDay()],
      dia: d.getUTCDate(),
    };
  });
}

const preco = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const OPCAO =
  "flex w-full items-center justify-between gap-3 rounded-2xl border border-black/10 p-4 text-left transition-colors hover:border-navalha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navalha";
const CAMPO =
  "h-12 rounded-xl border border-black/10 bg-[#F6F1F1] px-4 text-base outline-none placeholder:text-aco/70 focus:border-navalha focus:bg-white";
const VOLTAR = "self-start text-sm font-medium text-aco hover:text-tinta";

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-semibold tracking-tight">{children}</h2>;
}

export function BookingFlow({
  barbearia,
  barbeiros,
  servicos,
  barbeiroPreSelecionado,
}: {
  barbearia: Barbearia;
  barbeiros: Barbeiro[];
  servicos: Servico[];
  barbeiroPreSelecionado?: Barbeiro;
}) {
  const [passo, setPasso] = useState<Passo>("servico");
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<string | null>(
    barbeiroPreSelecionado?.id ?? null,
  );
  const [data, setData] = useState(hojeISO());
  const dias = useMemo(() => proximosDias(hojeISO()), []);
  const [slots, setSlots] = useState<SlotComBarbeiro[]>([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [slotEscolhido, setSlotEscolhido] = useState<SlotComBarbeiro | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ id: string; status: string } | null>(null);

  const servico = useMemo(
    () => servicos.find((s) => s.id === servicoId) ?? null,
    [servicos, servicoId],
  );

  function formatarHorarioSlot(iso: string) {
    const inicio = new Date(iso);
    const horaInicio = inicio.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: FUSO_BRASILIA,
    });

    if (!barbearia.mostrar_fim_servico_cliente || !servico) return horaInicio;

    const fim = new Date(inicio.getTime() + servico.duracao_min * 60_000);
    const horaFim = fim.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: FUSO_BRASILIA,
    });
    return `${horaInicio} - ${horaFim}`;
  }

  async function buscarSlots(
    novaData: string,
    barbeiroId: string | null,
    servicoIdOverride?: string,
  ) {
    const servicoIdAtual = servicoIdOverride ?? servicoId;
    if (!servicoIdAtual) return;
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
            `/api/disponibilidade?barbeiro_id=${bId}&servico_id=${servicoIdAtual}&data=${novaData}`,
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
    if (!servicoId || !slotEscolhido || !nome || !whatsapp || !email) return;
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
          email,
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
      <p className="text-center text-sm text-aco">
        Essa barbearia ainda não cadastrou serviços disponíveis.
      </p>
    );
  }

  const nomeBarbeiro = (id: string) => barbeiros.find((b) => b.id === id)?.nome;
  const resumo = [
    servico?.nome,
    barbeiroSelecionado && barbeiroSelecionado !== QUALQUER
      ? `com ${nomeBarbeiro(barbeiroSelecionado)}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      {passo === "servico" && (
        <div className="flex flex-col gap-3">
          {barbeiroPreSelecionado && (
            <p className="text-sm text-aco">
              Agendando com <strong className="text-tinta">{barbeiroPreSelecionado.nome}</strong>
            </p>
          )}
          <Titulo>Qual serviço?</Titulo>
          <div className="mt-1 flex flex-col gap-2">
            {servicos.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setServicoId(s.id);
                  if (barbeiroPreSelecionado) {
                    setPasso("data");
                    buscarSlots(data, barbeiroPreSelecionado.id, s.id);
                  } else {
                    setPasso("barbeiro");
                  }
                }}
                className={OPCAO}
              >
                <span>
                  <span className="block font-semibold">{s.nome}</span>
                  {s.legenda && <span className="mt-0.5 block text-sm text-aco">{s.legenda}</span>}
                  {s.mostrar_duracao && (
                    <span className="mt-0.5 block text-xs text-aco">{s.duracao_min} min</span>
                  )}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{preco(s.preco)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {passo === "barbeiro" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-aco">{servico?.nome}</p>
          <Titulo>Com quem?</Titulo>
          <div className="mt-1 flex flex-col gap-2">
            <button
              onClick={() => {
                setBarbeiroSelecionado(QUALQUER);
                setPasso("data");
                buscarSlots(data, QUALQUER);
              }}
              className={OPCAO}
            >
              <span className="font-semibold">Quem estiver livre</span>
              <span aria-hidden className="text-navalha">→</span>
            </button>
            {barbeiros.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBarbeiroSelecionado(b.id);
                  setPasso("data");
                  buscarSlots(data, b.id);
                }}
                className={OPCAO}
              >
                <span className="flex items-center gap-3">
                  {b.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.foto_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span
                      aria-hidden
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6F1F1] font-display text-sm font-semibold text-navalha"
                    >
                      {b.nome.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="font-semibold">{b.nome}</span>
                </span>
                <span aria-hidden className="text-navalha">→</span>
              </button>
            ))}
          </div>
          <button onClick={() => setPasso("servico")} className={VOLTAR}>
            ← Trocar serviço
          </button>
        </div>
      )}

      {passo === "data" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-aco">{resumo}</p>
          <Titulo>Quando?</Titulo>

          <div className="-mx-5 mt-1 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
            {dias.map((d) => {
              const ativo = d.iso === data;
              return (
                <button
                  key={d.iso}
                  aria-pressed={ativo}
                  onClick={() => {
                    setData(d.iso);
                    buscarSlots(d.iso, barbeiroSelecionado);
                  }}
                  className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navalha ${
                    ativo
                      ? "bg-navalha text-white"
                      : "border border-black/10 text-tinta hover:border-navalha"
                  }`}
                >
                  <span className={`text-xs ${ativo ? "text-rosado" : "text-aco"}`}>{d.semana}</span>
                  <span className="font-display text-lg font-semibold">{d.dia}</span>
                </button>
              );
            })}
          </div>

          {carregandoSlots && <p className="py-6 text-center text-sm text-aco">Vendo a agenda…</p>}
          {!carregandoSlots && slots.length === 0 && (
            <p className="rounded-2xl bg-[#F6F1F1] p-5 text-center text-sm text-aco">
              Nenhum horário livre nesse dia. Escolha outro dia acima.
            </p>
          )}
          {!carregandoSlots && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s.iso + s.barbeiroId}
                  onClick={() => {
                    setSlotEscolhido(s);
                    setPasso("dados");
                  }}
                  className="h-12 rounded-xl border border-black/10 font-semibold tabular-nums transition-colors hover:border-navalha hover:bg-navalha hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navalha"
                >
                  {formatarHorarioSlot(s.iso)}
                </button>
              ))}
            </div>
          )}
          {erro && <p className="text-sm text-navalha">{erro}</p>}
          <button
            onClick={() => setPasso(barbeiroPreSelecionado ? "servico" : "barbeiro")}
            className={VOLTAR}
          >
            ← Voltar
          </button>
        </div>
      )}

      {passo === "dados" && slotEscolhido && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirmarAgendamento();
          }}
          className="flex flex-col gap-3"
        >
          <div className="rounded-2xl bg-navalha p-4 text-white">
            <p className="font-semibold">{servico?.nome}</p>
            <p className="text-sm text-rosado">
              {new Date(slotEscolhido.iso).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: FUSO_BRASILIA,
              })}{" "}
              · {formatarHorarioSlot(slotEscolhido.iso)} · com {nomeBarbeiro(slotEscolhido.barbeiroId)}
            </p>
          </div>

          <Titulo>Seus dados</Titulo>
          <input
            required
            autoComplete="name"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={CAMPO}
          />
          <input
            required
            type="tel"
            autoComplete="tel"
            placeholder="WhatsApp com DDD"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={CAMPO}
          />
          <input
            required
            type="email"
            autoComplete="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={CAMPO}
          />
          <p className="text-xs text-aco">
            A confirmação e o link para cancelar chegam por e-mail.
          </p>

          {erro && <p className="text-sm text-navalha">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="mt-1 h-14 rounded-full bg-navalha text-base font-semibold text-white transition-colors hover:bg-navalha-escuro disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navalha"
          >
            {enviando ? "Marcando…" : "Confirmar horário"}
          </button>
          <button type="button" onClick={() => setPasso("data")} className={VOLTAR}>
            ← Trocar horário
          </button>
        </form>
      )}

      {passo === "confirmado" && resultado && slotEscolhido && (
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <RelogioNaviu className="h-20 w-20" titulo="" />
          <Titulo>Horário marcado</Titulo>

          <div className="w-full rounded-2xl bg-[#F6F1F1] p-5 text-left">
            <p className="font-semibold">{servico?.nome}</p>
            <p className="text-sm text-aco">com {nomeBarbeiro(slotEscolhido.barbeiroId)}</p>
            <p className="mt-3 font-display text-lg font-semibold">
              {new Date(slotEscolhido.iso).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: FUSO_BRASILIA,
              })}
            </p>
            <p className="font-display text-3xl font-semibold text-navalha tabular-nums">
              {formatarHorarioSlot(slotEscolhido.iso)}
            </p>
            {barbearia.endereco && <p className="mt-3 text-sm text-aco">{barbearia.endereco}</p>}
          </div>

          <p className="text-sm text-aco">
            Mandamos a confirmação e o link para cancelar no seu e-mail.
          </p>
          <a
            href={`/api/agendamentos/${resultado.id}/calendario.ics`}
            className="flex h-12 w-full items-center justify-center rounded-full border border-navalha font-semibold text-navalha transition-colors hover:bg-navalha hover:text-white"
          >
            Salvar na agenda do celular
          </a>
        </div>
      )}
    </div>
  );
}
