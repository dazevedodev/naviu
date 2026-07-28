import Link from "next/link";
import { HeroVideo } from "@/components/hero-video";
import { PlanosCards } from "@/components/planos-cards";

const FUNCIONALIDADES = [
  {
    titulo: "Agendamento online 24h",
    descricao:
      "Seu cliente escolhe barbeiro, serviço e horário sozinho, sem precisar te chamar no WhatsApp pra saber se tem vaga.",
  },
  {
    titulo: "Lembrete pronto pro WhatsApp",
    descricao:
      "Confirmação e lembrete de 1h antes já vêm com a mensagem pronta — você só clica e manda, sem depender de nenhuma API.",
  },
  {
    titulo: "Sinal via PIX (opcional)",
    descricao:
      "Ative a cobrança de sinal antecipado pra reduzir falta em horário marcado.",
  },
  {
    titulo: "Cada barbeiro com seu link",
    descricao:
      "No plano Barbearia, cada barbeiro pode divulgar o próprio link e já cai direto na agenda dele.",
  },
  {
    titulo: "Agenda organizada por barbeiro",
    descricao:
      "Veja o dia inteiro, marque forma de pagamento e conclua o atendimento direto pelo painel.",
  },
  {
    titulo: "Adiciona na agenda com 1 toque",
    descricao:
      "Depois de confirmar, o cliente adiciona o horário na agenda do celular dele automaticamente.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between px-6 py-6 sm:px-12">
        <span className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Naviu
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
        >
          Já sou cliente
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-24">
        <section className="flex w-full max-w-3xl flex-col items-center gap-6 py-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            Agendamento online pra barbearia, sem complicação
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Seus clientes marcam pelo link, você recebe tudo organizado por
            barbeiro e manda a confirmação pelo WhatsApp com um clique.
          </p>

          <div className="w-full max-w-2xl">
            <HeroVideo />
          </div>

          <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
            <a
              href="#planos"
              className="flex h-12 items-center justify-center rounded-full bg-zinc-950 px-8 text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Ver planos
            </a>
            <Link
              href="/login"
              className="flex h-12 items-center justify-center rounded-full border border-zinc-300 px-8 text-zinc-950 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Já sou cliente
            </Link>
          </div>
        </section>

        <section className="w-full max-w-5xl py-16">
          <h2 className="mb-10 text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            O que o Naviu faz por você
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCIONALIDADES.map((f) => (
              <div key={f.titulo}>
                <h3 className="mb-1 font-medium text-zinc-950 dark:text-zinc-50">
                  {f.titulo}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {f.descricao}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="planos" className="w-full max-w-3xl scroll-mt-10 py-16">
          <h2 className="mb-2 text-center text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Planos
          </h2>
          <p className="mb-10 text-center text-zinc-600 dark:text-zinc-400">
            Sem contrato de fidelidade. Cancele quando quiser.
          </p>
          <PlanosCards />
        </section>
      </main>
    </div>
  );
}
