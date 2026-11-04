import Link from "next/link";

// Peças repetidas das telas do painel, para todas terem a mesma cara.

export const BOTAO =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-navalha px-5 text-sm font-semibold text-white transition-colors hover:bg-navalha-escuro disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navalha";

export const BOTAO_CLARO =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-tinta transition-colors hover:border-tinta disabled:opacity-50";

export const CAMPO =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none placeholder:text-aco/70 focus:border-navalha";

export function Cabecalho({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  /** Botões à direita do título. */
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-aco">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Cartao({
  titulo,
  acao,
  className = "",
  children,
}: {
  titulo?: string;
  acao?: { href: string; texto: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-3xl bg-white p-5 lg:p-6 ${className}`}>
      {(titulo || acao) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titulo && <h2 className="font-display text-base font-semibold">{titulo}</h2>}
          {acao && (
            <Link href={acao.href} className="text-sm font-semibold text-navalha hover:underline">
              {acao.texto}
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// Um número grande com rótulo pequeno (faturamento, atendimentos...).
export function Numero({
  rotulo,
  valor,
  detalhe,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-3xl p-4 sm:p-5 ${destaque ? "bg-navalha text-white" : "bg-white"}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${destaque ? "text-rosado" : "text-aco"}`}>
        {rotulo}
      </p>
      <p className="mt-2 font-display text-xl font-semibold tabular-nums sm:text-2xl lg:text-[28px]">{valor}</p>
      {detalhe && <p className={`mt-1 text-xs ${destaque ? "text-rosado" : "text-aco"}`}>{detalhe}</p>}
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-[#F6F1F1] p-5 text-center text-sm text-aco">{children}</p>;
}

export function linkWhatsApp(telefone: string, texto?: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const numero = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function Iniciais({ nome, foto, tamanho = "h-10 w-10" }: { nome: string; foto?: string | null; tamanho?: string }) {
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" className={`${tamanho} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${tamanho} flex shrink-0 items-center justify-center rounded-full bg-rosado/60 font-display text-sm font-semibold text-navalha-escuro`}
    >
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  );
}
