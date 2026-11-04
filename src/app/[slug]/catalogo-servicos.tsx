"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Servico } from "@/lib/types";

// Lista de serviços da página da barbearia. Com poucos serviços é só a lista;
// com categorias aparecem as abas (Cabelo, Barba...) e com muitos, a busca.

const TODOS = "Todos";
const SEM_CATEGORIA = "Outros";
const BUSCA_A_PARTIR_DE = 8;

const preco = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function CatalogoServicos({
  servicos,
  slug,
  agendaAberta,
}: {
  servicos: Servico[];
  slug: string;
  agendaAberta: boolean;
}) {
  const [aba, setAba] = useState(TODOS);
  const [busca, setBusca] = useState("");

  // Categorias na ordem em que aparecem; "Outros" sempre por último.
  const categorias = useMemo(() => {
    const nomes = [...new Set(servicos.map((s) => s.categoria?.trim() || SEM_CATEGORIA))];
    return nomes.sort((a, b) => Number(a === SEM_CATEGORIA) - Number(b === SEM_CATEGORIA));
  }, [servicos]);
  const temCategorias = categorias.length > 1;

  const termo = semAcento(busca.trim());
  const visiveis = servicos.filter(
    (s) =>
      (aba === TODOS || (s.categoria?.trim() || SEM_CATEGORIA) === aba) &&
      (!termo || semAcento(`${s.nome} ${s.legenda ?? ""}`).includes(termo)),
  );

  const grupos = temCategorias
    ? categorias
        .map((c) => ({
          nome: c,
          itens: visiveis.filter((s) => (s.categoria?.trim() || SEM_CATEGORIA) === c),
        }))
        .filter((g) => g.itens.length > 0)
    : [{ nome: null, itens: visiveis }];

  return (
    <section aria-labelledby="titulo-servicos">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="titulo-servicos" className="font-display text-lg font-semibold tracking-tight lg:text-2xl">
          Serviços
        </h2>
        {servicos.length >= BUSCA_A_PARTIR_DE && (
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar serviço"
            aria-label="Buscar serviço"
            className="h-10 w-full rounded-full border border-black/10 bg-[#F6F1F1] px-4 text-sm outline-none placeholder:text-aco/70 focus:border-navalha focus:bg-white sm:w-56"
          />
        )}
      </div>

      {temCategorias && (
        <div
          role="tablist"
          aria-label="Categorias"
          className="sticky top-0 z-10 -mx-5 mt-4 flex gap-2 overflow-x-auto bg-white px-5 py-2 [scrollbar-width:none] lg:mx-0 lg:px-0"
        >
          {[TODOS, ...categorias].map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={aba === c}
              onClick={() => setAba(c)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navalha ${
                aba === c ? "bg-tinta text-white" : "bg-[#F6F1F1] text-tinta hover:bg-rosado/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {visiveis.length === 0 && (
        <p className="mt-6 rounded-2xl bg-[#F6F1F1] p-5 text-center text-sm text-aco">
          Nenhum serviço com esse nome. Tente outra palavra.
        </p>
      )}

      {grupos.map((g) => (
        <div key={g.nome ?? "lista"} className="mt-5">
          {g.nome && (
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-aco">
              {g.nome}
            </h3>
          )}
          <ul className="divide-y divide-black/[0.07] lg:grid lg:grid-cols-2 lg:gap-x-10 lg:divide-y-0">
            {g.itens.map((s) => (
              <li key={s.id} className="lg:border-b lg:border-black/[0.07]">
                <ItemServico servico={s} slug={slug} agendaAberta={agendaAberta} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function ItemServico({
  servico: s,
  slug,
  agendaAberta,
}: {
  servico: Servico;
  slug: string;
  agendaAberta: boolean;
}) {
  const conteudo = (
    <>
      {s.imagem_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.imagem_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{s.nome}</span>
        {s.legenda && <span className="mt-0.5 block text-sm text-aco">{s.legenda}</span>}
        <span className="mt-1 block text-sm">
          <span className="font-semibold tabular-nums">{preco(s.preco)}</span>
          {s.mostrar_duracao && <span className="text-aco"> · {s.duracao_min} min</span>}
        </span>
      </span>
    </>
  );

  if (!agendaAberta) return <div className="flex items-center gap-4 py-4">{conteudo}</div>;

  return (
    <Link
      href={`/${slug}/agendar?servico=${s.id}`}
      className="group flex items-center gap-4 rounded-2xl py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navalha"
    >
      {conteudo}
      <span className="shrink-0 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-navalha transition-colors group-hover:border-navalha group-hover:bg-navalha group-hover:text-white">
        Agendar
      </span>
    </Link>
  );
}
