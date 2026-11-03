import Image from "next/image";
import Link from "next/link";
import { RelogioNaviu } from "@/components/relogio-naviu";
import type { Barbearia } from "@/lib/types";

// Visual único de todas as barbearias no Naviu: fundo vermelho da marca e uma
// folha branca com o conteúdo. A barbearia muda só a capa, a foto de perfil e
// o nome.

function Avatar({ barbearia, tamanho }: { barbearia: Barbearia; tamanho: "g" | "p" }) {
  const classe =
    tamanho === "g"
      ? "h-24 w-24 text-3xl ring-4 ring-white"
      : "h-12 w-12 text-lg ring-2 ring-white/70";
  if (barbearia.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={barbearia.logo_url}
        alt=""
        className={`${classe} shrink-0 rounded-full bg-white object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${classe} flex shrink-0 items-center justify-center rounded-full font-display font-semibold ${
        tamanho === "g" ? "bg-white text-navalha" : "bg-white/15 text-white"
      }`}
    >
      {barbearia.nome.charAt(0).toUpperCase()}
    </span>
  );
}

function Capa({ barbearia }: { barbearia: Barbearia }) {
  return (
    <div className="relative h-40 overflow-hidden sm:mt-6 sm:h-48 sm:rounded-t-[28px]">
      {barbearia.capa_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={barbearia.capa_url} alt="" className="h-full w-full object-cover" />
      ) : (
        // Sem capa: o relógio da marca grande, cortado na borda.
        <RelogioNaviu
          cor="#ffffff"
          titulo=""
          className="absolute -right-10 -top-8 h-64 w-64 opacity-[0.12]"
        />
      )}
      {/* A foto da capa se funde no vermelho de baixo. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navalha" />
    </div>
  );
}

export function CascaBarbearia({
  barbearia,
  compacta = false,
  topo,
  children,
}: {
  barbearia: Barbearia;
  /** Telas de agendamento: cabeçalho pequeno com volta para a página da barbearia. */
  compacta?: boolean;
  /** Página da barbearia: o que fica no vermelho, abaixo do nome (os botões). */
  topo?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-navalha font-sans text-tinta">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {compacta ? (
          <header className="flex items-center gap-3 px-5 pb-6 pt-6 text-white">
            <Link
              href={`/b/${barbearia.slug}`}
              aria-label={`Voltar para ${barbearia.nome}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
            >
              ←
            </Link>
            <Avatar barbearia={barbearia} tamanho="p" />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold">{barbearia.nome}</p>
              {barbearia.endereco && (
                <p className="truncate text-xs text-rosado">{barbearia.endereco}</p>
              )}
            </div>
          </header>
        ) : (
          <>
            <Capa barbearia={barbearia} />
            <header className="relative -mt-12 flex flex-col items-center px-5 pb-8 text-center text-white">
              <Avatar barbearia={barbearia} tamanho="g" />
              <h1 className="mt-4 font-display text-2xl font-semibold leading-tight tracking-tight">
                {barbearia.nome}
              </h1>
              {barbearia.endereco && (
                <p className="mt-2 text-sm text-rosado">{barbearia.endereco}</p>
              )}
              {topo && <div className="mt-7 w-full text-left">{topo}</div>}
            </header>
          </>
        )}

        <main className="relative flex flex-1 flex-col rounded-t-[28px] bg-white px-5 pb-8 pt-7">
          <div className="flex-1">{children}</div>

          <Link
            href="/"
            className="mt-10 flex items-center justify-center gap-2 text-xs text-aco hover:text-tinta"
          >
            Agendamento por
            <Image src="/marca/naviu-logo.svg" alt="Naviu" width={64} height={18} unoptimized />
          </Link>
        </main>
      </div>
    </div>
  );
}

export function AgendaPausada() {
  return (
    <div className="rounded-2xl bg-white/12 p-5 text-center text-sm text-white">
      O agendamento online desta barbearia está pausado no momento. Fale com eles pelo
      WhatsApp pra marcar seu horário.
    </div>
  );
}
