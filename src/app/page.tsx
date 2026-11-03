import Image from "next/image";
import Link from "next/link";
import { HeroVideo } from "@/components/hero-video";
import { YOUTUBE_VIDEO_ID } from "@/components/hero-video-config";
import { RelogioNaviu } from "@/components/relogio-naviu";
import { DIAS_TESTE, PLANOS, formatarReais } from "@/lib/planos";

// O que o Naviu faz, do jeito que o barbeiro reconhece. `plano` marca o que
// só existe no plano Barbearia.
const RECURSOS: { titulo: string; texto: string; plano?: string }[] = [
  {
    titulo: "Agenda aberta 24h",
    texto: "O cliente escolhe serviço, barbeiro e horário sem te chamar no WhatsApp.",
  },
  {
    titulo: "Recepção com IA",
    texto: "Ele escreve “quero cortar sexta à tarde” e ela acha o horário e marca.",
  },
  {
    titulo: "Confirmação na véspera",
    texto: "O cliente confirma presença por e-mail e recebe um lembrete 1h antes.",
  },
  {
    titulo: "Lista de espera",
    texto: "Dia cheio? Quando alguém cancela, quem estava esperando é avisado.",
  },
  {
    titulo: "Histórico de faltas",
    texto: "No painel você vê quem costuma faltar ou desmarcar em cima da hora.",
  },
  {
    titulo: "Um link pra cada barbeiro",
    texto: "Cada um divulga o seu e o cliente cai direto na agenda dele.",
    plano: "Barbearia",
  },
];

const PASSOS = [
  {
    titulo: "Monte a barbearia",
    texto: "Serviços, preços, barbeiros e o horário de cada um.",
  },
  {
    titulo: "Divulgue o link",
    texto: "Na bio do Instagram, no status e no WhatsApp.",
  },
  {
    titulo: "Receba os horários",
    texto: "O cliente marca sozinho e aparece na sua agenda do dia.",
  },
];

const CONVERSA: { autor: "cliente" | "recepcao"; texto: string }[] = [
  { autor: "cliente", texto: "Quero cortar sexta à tarde" },
  { autor: "recepcao", texto: "Sexta tenho 14h, 15h30 e 17h com o Rafael. Qual fica melhor?" },
  { autor: "cliente", texto: "15h30. Sou o Pedro, 11 98888-0000" },
  { autor: "recepcao", texto: "Marcado: corte com o Rafael, sexta às 15h30. Até lá!" },
];

// Como a página da barbearia aparece no celular do cliente.
function CelularCliente() {
  return (
    <figure
      aria-label="Exemplo da página de uma barbearia no Naviu, no celular do cliente"
      className="relative mx-auto w-[280px] shrink-0 overflow-hidden rounded-[40px] border-[10px] border-tinta bg-navalha shadow-[0_40px_80px_-30px_rgba(28,20,21,0.6)]"
    >
      <div className="relative h-24 overflow-hidden">
        <RelogioNaviu cor="#ffffff" titulo="" className="absolute -right-6 -top-6 h-40 w-40 opacity-[0.12]" />
      </div>
      <div className="-mt-9 flex flex-col items-center px-5 pb-5 text-center text-white">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white font-display text-2xl font-semibold text-navalha ring-4 ring-white">
          Z
        </span>
        <p className="mt-3 font-display text-lg font-semibold">Barbearia do Zé</p>
        <p className="text-[11px] text-rosado">Rua das Flores, 120</p>
        <span className="mt-4 flex h-10 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-navalha">
          Agendar horário
        </span>
        <span className="mt-2 flex h-10 w-full items-center justify-center rounded-full border-2 border-white/70 text-sm font-semibold">
          Agendar conversando
        </span>
      </div>
      <div className="rounded-t-[24px] bg-white px-5 pb-6 pt-4 text-tinta">
        <p className="font-display text-xs font-semibold">Serviços</p>
        {[
          ["Corte", "R$ 40,00"],
          ["Corte + barba", "R$ 65,00"],
          ["Barba", "R$ 30,00"],
        ].map(([nome, valor]) => (
          <div
            key={nome}
            className="flex justify-between border-b border-black/[0.07] py-2.5 text-sm last:border-0"
          >
            <span className="font-medium">{nome}</span>
            <span className="font-semibold tabular-nums">{valor}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

const BOTAO_BRANCO =
  "flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-navalha transition-colors hover:bg-rosado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-navalha font-sans text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Image
          src="/marca/naviu-logo-branco.svg"
          alt="Naviu"
          width={128}
          height={36}
          priority
          unoptimized
        />
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40 transition-colors hover:bg-white hover:text-navalha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Entrar
        </Link>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Topo: o relógio da marca marcando a hora de agora. */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-20 pt-6 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-12">
          <div>
            <h1 className="font-display text-[clamp(2.6rem,7.5vw,5.4rem)] font-semibold leading-[0.95] tracking-tight">
              O cliente marca. Você corta.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-rosado">
              Link de agendamento pra sua barbearia, com recepção por IA, confirmação na
              véspera e lista de espera. Sem parar a máquina pra responder mensagem.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/cadastro" className={BOTAO_BRANCO}>
                Testar {DIAS_TESTE} dias grátis
              </Link>
              <a
                href="#planos"
                className="text-center font-semibold text-white underline-offset-4 hover:underline"
              >
                Ver planos
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <RelogioNaviu
              cor="#ffffff"
              aoVivo
              titulo="Relógio do Naviu marcando a hora de Brasília"
              className="w-[min(78vw,420px)]"
            />
            <p className="mt-2 text-sm text-rosado">Hora certa em Brasília</p>
          </div>
        </section>

        {/* Na tela do cliente */}
        <section className="bg-white text-tinta">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[auto_1fr] lg:gap-20 lg:py-28">
            <CelularCliente />
            <div>
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Tudo que o cliente precisa, num link só.
              </h2>
              <ul className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                {RECURSOS.map((r) => (
                  <li key={r.titulo} className="border-t-2 border-navalha pt-4">
                    <h3 className="font-semibold">
                      {r.titulo}
                      {r.plano && (
                        <span className="ml-2 rounded-full bg-[#F6F1F1] px-2 py-0.5 text-xs font-medium text-navalha">
                          plano {r.plano}
                        </span>
                      )}
                    </h3>
                    <p className="mt-1 text-aco">{r.texto}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Recepção com IA */}
        <section className="bg-tinta">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
            <div>
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Uma recepção que entende o que o cliente escreve.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70">
                Ele escreve do jeito dele. A recepção olha a sua agenda de verdade, oferece
                só horário livre e marca depois que ele confirma.
              </p>
            </div>
            <figure className="rounded-3xl bg-white p-5 text-tinta">
              <figcaption className="mb-4 text-xs font-medium text-aco">Exemplo de conversa</figcaption>
              <div className="flex flex-col gap-2">
                {CONVERSA.map((m) => (
                  <p
                    key={m.texto}
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${
                      m.autor === "cliente"
                        ? "self-end rounded-br-md bg-navalha text-white"
                        : "self-start rounded-bl-md bg-[#F6F1F1]"
                    }`}
                  >
                    {m.texto}
                  </p>
                ))}
              </div>
            </figure>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Em três passos
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="border-t-2 border-white/40 pt-5">
                <span className="font-display text-4xl font-semibold text-white/40">{i + 1}</span>
                <h3 className="mt-3 text-xl font-semibold">{p.titulo}</h3>
                <p className="mt-1 text-rosado">{p.texto}</p>
              </li>
            ))}
          </ol>
          {YOUTUBE_VIDEO_ID && (
            <div className="mx-auto mt-16 max-w-3xl">
              <HeroVideo />
            </div>
          )}
        </section>

        {/* Planos */}
        <section id="planos" className="scroll-mt-0 bg-white text-tinta">
          <div className="mx-auto w-full max-w-4xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Planos
            </h2>
            <p className="mt-3 text-center text-aco">
              {DIAS_TESTE} dias grátis, sem cartão. Sem fidelidade: cancele quando quiser.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {PLANOS.map((plano) => (
                <div
                  key={plano.id}
                  className={`flex flex-col rounded-3xl p-7 ${
                    plano.destaque ? "bg-navalha text-white" : "border border-black/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-2xl font-semibold">{plano.nome}</h3>
                    {plano.destaque && (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-navalha">
                        Mais escolhido
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-3xl font-semibold tabular-nums">
                    {formatarReais(plano.valor)}
                    <span className={`text-base font-medium ${plano.destaque ? "text-rosado" : "text-aco"}`}>
                      /mês
                    </span>
                  </p>
                  <ul
                    className={`mb-8 mt-6 flex flex-1 flex-col gap-2.5 text-sm ${
                      plano.destaque ? "text-rosado" : "text-aco"
                    }`}
                  >
                    {plano.recursos.map((r) => (
                      <li key={r} className="flex gap-2.5">
                        <span aria-hidden className={plano.destaque ? "text-white" : "text-navalha"}>
                          ✓
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/cadastro"
                    className={`flex h-12 items-center justify-center rounded-full px-6 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      plano.destaque
                        ? "bg-white text-navalha hover:bg-rosado focus-visible:outline-white"
                        : "bg-navalha text-white hover:bg-navalha-escuro focus-visible:outline-navalha"
                    }`}
                  >
                    Testar {DIAS_TESTE} dias grátis
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-tinta">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-white/60 sm:px-8">
          <Image src="/marca/naviu-logo-branco.svg" alt="Naviu" width={96} height={27} unoptimized />
          <span>naviu.app.br</span>
          <Link href="/login" className="font-semibold text-white hover:underline">
            Já sou cliente
          </Link>
        </div>
      </footer>
    </div>
  );
}
