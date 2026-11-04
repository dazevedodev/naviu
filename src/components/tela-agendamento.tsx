import Image from "next/image";
import Link from "next/link";

// Moldura das páginas que o cliente abre pelo e-mail (confirmar presença e
// cancelar): fundo vermelho da marca e um cartão branco com o horário.

const FUSO = "America/Sao_Paulo";

export type DadosAgendamento = {
  barbearia: { nome: string; slug: string; endereco: string | null } | null;
  servico: string | undefined;
  barbeiro: string | undefined;
  dataHora: Date;
};

export function TelaAgendamento({
  titulo,
  dados,
  children,
}: {
  titulo: string;
  dados: DadosAgendamento | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center bg-navalha px-5 pb-12 pt-8 font-sans text-tinta">
      <Link href="/" aria-label="Naviu" className="mb-8">
        <Image src="/marca/naviu-logo-branco.svg" alt="Naviu" width={96} height={27} unoptimized />
      </Link>

      <main className="w-full max-w-md rounded-[28px] bg-white p-6 sm:p-8">
        <h1 className="font-display text-xl font-semibold tracking-tight">{titulo}</h1>

        {dados && (
          <div className="mt-5 rounded-2xl bg-[#F6F1F1] p-5">
            {dados.barbearia && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-aco">
                {dados.barbearia.nome}
              </p>
            )}
            <p className="mt-3 font-semibold first-letter:uppercase">
              {dados.dataHora.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: FUSO,
              })}
            </p>
            <p className="font-display text-4xl font-semibold text-navalha tabular-nums">
              {dados.dataHora.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: FUSO,
              })}
            </p>
            <p className="mt-3 text-sm">
              {dados.servico}
              {dados.barbeiro && <span className="text-aco"> com {dados.barbeiro}</span>}
            </p>
            {dados.barbearia?.endereco && (
              <p className="mt-1 text-sm text-aco">{dados.barbearia.endereco}</p>
            )}
          </div>
        )}

        <div className="mt-6">{children}</div>
      </main>

      {dados?.barbearia && (
        <Link
          href={`/${dados.barbearia.slug}`}
          className="mt-6 text-sm font-medium text-rosado underline-offset-4 hover:text-white hover:underline"
        >
          Ir para a página da {dados.barbearia.nome}
        </Link>
      )}
    </div>
  );
}

export const BOTAO_PRINCIPAL =
  "flex h-14 w-full items-center justify-center rounded-full bg-navalha text-base font-semibold text-white transition-colors hover:bg-navalha-escuro disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navalha";

export const BOTAO_SECUNDARIO =
  "flex h-12 w-full items-center justify-center rounded-full border border-black/10 text-sm font-semibold text-tinta transition-colors hover:border-tinta disabled:opacity-60";

export function Aviso({ tom = "neutro", children }: { tom?: "ok" | "neutro" | "erro"; children: React.ReactNode }) {
  const cor =
    tom === "ok" ? "bg-emerald-50 text-emerald-800" : tom === "erro" ? "bg-rosado/50 text-navalha-escuro" : "bg-[#F6F1F1] text-aco";
  return <p className={`rounded-2xl p-4 text-sm ${cor}`}>{children}</p>;
}
