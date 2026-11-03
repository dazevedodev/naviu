import Image from "next/image";
import Link from "next/link";
import {
  Big_Shoulders,
  Figtree,
  IBM_Plex_Mono,
  Yellowtail,
} from "next/font/google";
import { HeroVideo } from "@/components/hero-video";
import { YOUTUBE_VIDEO_ID } from "@/components/hero-video-config";
import { DIAS_TESTE, PLANOS, formatarReais } from "@/lib/planos";

const letreiro = Big_Shoulders({
  variable: "--font-letreiro",
  subsets: ["latin"],
  axes: ["opsz"],
  // O Next não tem métricas da Big Shoulders pra gerar fallback automático.
  adjustFontFallback: false,
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
});
const corpo = Figtree({ variable: "--font-corpo", subsets: ["latin"] });
const mono = IBM_Plex_Mono({
  variable: "--font-mono-naviu",
  subsets: ["latin"],
  weight: ["400", "500"],
});
const cursiva = Yellowtail({
  variable: "--font-cursiva",
  subsets: ["latin"],
  weight: "400",
});

// Funcionalidades em forma de tabela de serviços de barbearia: no lugar do
// preço vai "incluso", ou o plano em que ela aparece.
const TABELA: { servico: string; detalhe: string; soNoPlano?: string }[] = [
  {
    servico: "Agendamento online 24h",
    detalhe: "O cliente escolhe barbeiro, serviço e horário sem te chamar no WhatsApp.",
  },
  {
    servico: "Recepção com IA",
    detalhe: "O cliente escreve “quero cortar sexta à tarde” e ela acha o horário e marca.",
  },
  {
    servico: "Confirmação e lembrete",
    detalhe: "Pede pro cliente confirmar na véspera e lembra 1h antes do corte. Sozinho.",
  },
  {
    servico: "Lista de espera",
    detalhe: "Dia cheio? Quando alguém cancela, quem estava esperando é avisado na hora.",
  },
  {
    servico: "Histórico de faltas",
    detalhe: "Você vê no painel quem costuma faltar ou desmarcar em cima da hora.",
  },
  {
    servico: "Um link pra cada barbeiro",
    detalhe: "Cada um divulga o seu e o cliente cai direto na agenda dele.",
    soNoPlano: "Barbearia",
  },
  {
    servico: "Agenda do dia por barbeiro",
    detalhe: "Marque a forma de pagamento e conclua o atendimento pelo painel.",
    soNoPlano: "Barbearia",
  },
  {
    servico: "Horário na agenda do celular",
    detalhe: "Depois de confirmar, o cliente salva o corte na agenda dele com 1 toque.",
  },
];

const PASSOS = [
  {
    titulo: "Você monta a barbearia",
    texto: "Cadastra serviços, preços, barbeiros e os horários de cada um.",
  },
  {
    titulo: "Divulga o link",
    texto: "Coloca na bio do Instagram, no status e no WhatsApp da barbearia.",
  },
  {
    titulo: "O cliente marca sozinho",
    texto: "O horário aparece na sua agenda e ele recebe a confirmação por e-mail.",
  },
];

const HORARIOS: { hora: string; estado: "livre" | "ocupado" | "escolhido" }[] = [
  { hora: "09:00", estado: "ocupado" },
  { hora: "09:40", estado: "livre" },
  { hora: "10:20", estado: "ocupado" },
  { hora: "11:00", estado: "escolhido" },
  { hora: "11:40", estado: "livre" },
  { hora: "14:00", estado: "livre" },
];

function PrevisaoAgendamento() {
  return (
    <figure
      aria-label="Exemplo da página de agendamento de uma barbearia no Naviu"
      className="relative w-full max-w-sm rounded-[28px] bg-[#F7F2EC] p-5 text-[#1A1213] shadow-[0_30px_80px_-20px_rgba(40,0,0,0.55)]"
    >
      <p className="font-[family-name:var(--font-mono-naviu)] text-[11px] text-[#6E6264]">
        naviu.app.br/b/barbearia-do-ze
      </p>
      <p className="mt-2 font-[family-name:var(--font-cursiva)] text-4xl leading-none text-[#C1272D]">
        Barbearia do Zé
      </p>

      <ul className="mt-5 divide-y divide-[#1A1213]/10 border-y border-[#1A1213]/10 text-sm">
        {[
          ["Corte", "R$ 40"],
          ["Corte + barba", "R$ 60"],
          ["Barba", "R$ 30"],
        ].map(([nome, preco]) => {
          const escolhido = nome === "Corte + barba";
          return (
            <li
              key={nome}
              className={`flex items-center justify-between px-2 py-2.5 ${
                escolhido ? "bg-[#1A1213] font-semibold text-[#F7F2EC]" : ""
              }`}
            >
              <span>{nome}</span>
              <span className="font-[family-name:var(--font-mono-naviu)]">{preco}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#6E6264]">
        Sábado, 24 · com o Léo
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 font-[family-name:var(--font-mono-naviu)] text-sm">
        {HORARIOS.map((h) => (
          <span
            key={h.hora}
            className={`rounded-lg py-2 text-center ${
              h.estado === "escolhido"
                ? "bg-[#C1272D] font-medium text-white"
                : h.estado === "ocupado"
                  ? "text-[#1A1213]/30 line-through"
                  : "border border-[#1A1213]/20"
            }`}
          >
            {h.hora}
          </span>
        ))}
      </div>

      <div className="mt-5 rounded-full bg-[#1A1213] py-3 text-center text-sm font-semibold text-[#F7F2EC]">
        Confirmar horário
      </div>
    </figure>
  );
}

export default function Home() {
  return (
    <div
      className={`${letreiro.variable} ${corpo.variable} ${mono.variable} ${cursiva.variable} flex flex-1 flex-col bg-[#C1272D] font-[family-name:var(--font-corpo)] text-[#FFF8F3]`}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Image
          src="/marca/naviu-logo-branco.svg"
          alt="Naviu"
          width={142}
          height={40}
          priority
          unoptimized
        />
        <Link
          href="/login"
          className="rounded-full px-3 py-2 text-sm font-medium text-[#FBDAD6] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Já sou cliente
        </Link>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-8 sm:px-8 lg:grid-cols-[1fr_auto] lg:gap-16 lg:pt-14">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#1A1213]">
              <span aria-hidden className="h-px w-8 bg-[#1A1213]" />
              Agendamento pra barbearia
            </p>
            <h1 className="font-[family-name:var(--font-letreiro)] text-[clamp(3.5rem,11vw,8rem)] font-black uppercase leading-[0.86] tracking-tight">
              Cadeira cheia.
              <br />
              <span className="text-[#1A1213]">Agenda</span> em ordem.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-[#FBDAD6]">
              O cliente marca o corte pelo seu link, a qualquer hora. Você vê o
              dia de cada barbeiro e o lembrete sai sozinho, sem você parar a
              máquina pra responder mensagem.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#planos"
                className="flex h-13 items-center justify-center rounded-full bg-[#FFF8F3] px-8 font-semibold text-[#C1272D] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Ver planos
              </a>
              <a
                href="#como-funciona"
                className="flex h-13 items-center justify-center rounded-full border border-[#FFF8F3]/40 px-8 font-semibold transition-colors hover:border-[#FFF8F3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Como funciona
              </a>
            </div>
          </div>

          <div className="flex items-stretch justify-center gap-5 sm:gap-8">
            <div className="flex flex-col items-center" aria-hidden>
              <span className="h-4 w-9 rounded-t-full bg-[#1A1213]" />
              <span className="poste-barbeiro w-6 flex-1 border-x-4 border-[#1A1213]" />
              <span className="h-4 w-9 rounded-b-full bg-[#1A1213]" />
            </div>
            <PrevisaoAgendamento />
          </div>
        </section>

        {/* Tabela de serviços */}
        <section className="bg-[#F7F2EC] text-[#1A1213]">
          <div className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-8">
            <h2 className="text-center font-[family-name:var(--font-letreiro)] text-5xl font-black uppercase sm:text-6xl">
              Tabela de serviços
            </h2>
            <p className="mt-3 text-center text-[#5E5254]">
              O que o Naviu faz pela sua barbearia.
            </p>
            <ul className="mt-12 flex flex-col gap-7">
              {TABELA.map((item) => (
                <li key={item.servico}>
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-[family-name:var(--font-letreiro)] text-xl font-extrabold uppercase leading-tight sm:text-3xl">
                      {item.servico}
                    </h3>
                    <span
                      aria-hidden
                      className="mb-1.5 min-w-6 flex-1 border-b-2 border-dotted border-[#1A1213]/30"
                    />
                    <span className="font-[family-name:var(--font-mono-naviu)] text-sm shrink-0 font-medium uppercase text-[#C1272D]">
                      {item.soNoPlano ? `plano ${item.soNoPlano}` : "incluso"}
                    </span>
                  </div>
                  <p className="mt-1 max-w-xl text-[#5E5254]">{item.detalhe}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Como funciona */}
        <section
          id="como-funciona"
          className="mx-auto w-full max-w-6xl scroll-mt-6 px-4 py-20 sm:px-8"
        >
          <h2 className="font-[family-name:var(--font-letreiro)] text-5xl font-black uppercase sm:text-6xl">
            Como funciona
          </h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo} className="border-t-2 border-[#FFF8F3] pt-5">
                <span className="font-[family-name:var(--font-mono-naviu)] text-sm text-[#1A1213]">
                  Passo {i + 1}
                </span>
                <h3 className="mt-2 text-xl font-bold">{passo.titulo}</h3>
                <p className="mt-2 text-[#FBDAD6]">{passo.texto}</p>
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
        <section
          id="planos"
          className="bg-[#1A1213] scroll-mt-0"
        >
          <div className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-8">
            <h2 className="text-center font-[family-name:var(--font-letreiro)] text-5xl font-black uppercase sm:text-6xl">
              Planos
            </h2>
            <p className="mt-3 text-center text-[#CFC3C4]">
              {DIAS_TESTE} dias grátis, sem cartão. Sem fidelidade: cancele quando quiser.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {PLANOS.map((plano) => (
                <div
                  key={plano.id}
                  className={`flex flex-col rounded-3xl p-7 ${
                    plano.destaque
                      ? "bg-[#F7F2EC] text-[#1A1213]"
                      : "border border-white/15 bg-[#241A1B]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-[family-name:var(--font-letreiro)] text-3xl font-black uppercase">
                      {plano.nome}
                    </h3>
                    {plano.destaque && (
                      <span className="rounded-full bg-[#C1272D] px-3 py-1 text-xs font-semibold text-white">
                        Mais escolhido
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-mono-naviu)] text-2xl font-medium">
                    {formatarReais(plano.valor)}/mês
                  </p>
                  <ul
                    className={`mt-6 mb-8 flex flex-1 flex-col gap-2.5 text-sm ${
                      plano.destaque ? "text-[#4A3E40]" : "text-[#CFC3C4]"
                    }`}
                  >
                    {plano.recursos.map((r) => (
                      <li key={r} className="flex gap-2.5">
                        <span aria-hidden className="text-[#C1272D]">
                          ✓
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/cadastro"
                    className={`flex h-12 items-center justify-center rounded-full px-6 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C1272D] ${
                      plano.destaque
                        ? "bg-[#C1272D] text-white hover:bg-[#A51F25]"
                        : "border border-[#C1272D] text-[#FFF8F3] hover:bg-[#C1272D]"
                    }`}
                  >
                    Testar {DIAS_TESTE} dias grátis
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-sm text-[#CFC3C4]">
              Já tem conta?{" "}
              <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
                Entrar no painel
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-between gap-4 bg-[#1A1213] px-4 py-6 text-sm text-[#CFC3C4] sm:px-8">
        <Image src="/marca/naviu-logo-branco.svg" alt="Naviu" width={100} height={28} unoptimized />
        <span>naviu.app.br</span>
      </footer>
    </div>
  );
}
