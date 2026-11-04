import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import {
  NOME_REMUNERACAO,
  reais,
  resumirFinanceiro,
  type BarbeiroFinanceiro,
  type Lancamento,
} from "@/lib/financeiro";
import { formatarDataBrasilia, horarioBrasilia, hojeISOBrasilia } from "@/lib/timezone";
import { NOME_FORMA } from "../agenda/detalhe-horario";
import { Cabecalho, Cartao, Iniciais, Numero, Vazio } from "../ui";
import { BotaoPagar, NovoLancamento, RemoverLancamento } from "./controles";

// O banco devolve no máximo 1.000 linhas por pedido: busca de mil em mil.
async function todasAsLinhas<T>(buscar: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>) {
  const linhas: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await buscar(de, de + 999);
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) return linhas;
  }
}

function somarMes(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

function descricaoRemuneracao(b: BarbeiroFinanceiro) {
  if (b.remuneracao === "comissao") return `Comissão de ${b.comissao_percentual}%`;
  if (b.remuneracao === "fixo_comissao") return `${reais(b.valor_fixo)} + ${b.comissao_percentual}%`;
  return `Aluga a cadeira por ${reais(b.valor_fixo)}`;
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesPedido } = await searchParams;
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();
  const hoje = hojeISOBrasilia();
  const mes = mesPedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesPedido) ? mesPedido : hoje.slice(0, 7);
  const proximo = somarMes(mes, 1);
  const inicio = horarioBrasilia(`${mes}-01`, "00:00").toISOString();
  const fim = horarioBrasilia(`${proximo}-01`, "00:00").toISOString();
  const rotulo = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const [{ data: barbeirosBanco }, atendidos, { data: lancamentos }] = await Promise.all([
    supabase
      .from("barbeiros")
      .select("id, nome, foto_url, ativo, remuneracao, comissao_percentual, valor_fixo")
      .eq("barbearia_id", barbearia.id)
      .order("nome"),
    todasAsLinhas((de, ate) =>
      supabase
        .from("agendamentos")
        .select("barbeiro_id, valor_cobrado, forma_pagamento, servicos(nome, preco)")
        .eq("barbearia_id", barbearia.id)
        .eq("status", "concluido")
        .gte("data_hora", inicio)
        .lt("data_hora", fim)
        .order("data_hora")
        .range(de, ate),
    ),
    supabase
      .from("lancamentos")
      .select("id, tipo, barbeiro_id, descricao, valor, data")
      .eq("barbearia_id", barbearia.id)
      .gte("data", `${mes}-01`)
      .lt("data", `${proximo}-01`)
      .order("data", { ascending: false }),
  ]);

  const atendimentos = atendidos.map((a) => {
    const s = a.servicos as unknown as { nome: string; preco: number } | null;
    return {
      barbeiro_id: a.barbeiro_id as string,
      valor: Number(a.valor_cobrado ?? s?.preco ?? 0),
      forma_pagamento: a.forma_pagamento as string | null,
      servico: s?.nome ?? "Serviço",
    };
  });
  const lista = (lancamentos ?? []).map((l) => ({ ...l, valor: Number(l.valor) }));

  // Barbeiro inativo só aparece se teve movimento no mês.
  const barbeiros: (BarbeiroFinanceiro & { foto_url: string | null })[] = (barbeirosBanco ?? [])
    .filter(
      (b) =>
        b.ativo ||
        atendimentos.some((a) => a.barbeiro_id === b.id) ||
        lista.some((l) => l.barbeiro_id === b.id),
    )
    .map((b) => ({
      id: b.id,
      nome: b.nome,
      foto_url: b.foto_url,
      remuneracao: b.remuneracao ?? "comissao",
      comissao_percentual: Number(b.comissao_percentual ?? 50),
      valor_fixo: Number(b.valor_fixo ?? 0),
    }));

  const r = resumirFinanceiro(barbeiros, atendimentos, lista as Lancamento[]);
  const nomeBarbeiro = (id: string | null) => barbeiros.find((b) => b.id === id)?.nome ?? "";
  const maiorForma = Math.max(1, ...r.porForma.map((f) => f.valor));
  const mesAtual = mes === hoje.slice(0, 7);

  return (
    <div>
      <Cabecalho titulo="Financeiro" descricao="Só conta o que foi fechado na agenda como atendido.">
        <div className="flex items-center rounded-full bg-white p-1">
          <Link href={`/admin/financeiro?mes=${somarMes(mes, -1)}`} aria-label="Mês anterior" className="rounded-full px-3 py-1.5 text-lg leading-none hover:bg-[#F6F1F1]">
            ‹
          </Link>
          <span className="px-2 text-sm font-semibold first-letter:uppercase">{rotulo}</span>
          <Link href={`/admin/financeiro?mes=${proximo}`} aria-label="Próximo mês" className="rounded-full px-3 py-1.5 text-lg leading-none hover:bg-[#F6F1F1]">
            ›
          </Link>
        </div>
      </Cabecalho>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero
          rotulo="Faturamento"
          valor={reais(r.faturamento)}
          detalhe={`${r.atendimentos} atendimentos · média ${reais(r.ticketMedio)}`}
          destaque
        />
        <Numero
          rotulo="Equipe"
          valor={reais(r.repasseEquipe)}
          detalhe={r.aluguel > 0 ? `recebe ${reais(r.aluguel)} de aluguel de cadeira` : "comissões e salários"}
        />
        <Numero rotulo="Despesas" valor={reais(r.despesas)} />
        <Numero
          rotulo={r.lucro >= 0 ? "Sobra para a barbearia" : "Prejuízo"}
          valor={reais(r.lucro)}
          detalhe={mesAtual ? "até agora" : undefined}
        />
      </div>

      <Cartao titulo="Quanto cada um recebe" acao={{ href: "/admin/barbeiros", texto: "Ajustar comissões" }} className="mt-6">
        {r.porBarbeiro.length === 0 ? (
          <Vazio>Cadastre os barbeiros para ver as comissões.</Vazio>
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {r.porBarbeiro.map((p) => {
              const foto = barbeiros.find((b) => b.id === p.barbeiro.id)?.foto_url;
              return (
                <li key={p.barbeiro.id} className="flex flex-wrap items-center gap-4 py-4">
                  <Iniciais nome={p.barbeiro.nome} foto={foto} tamanho="h-11 w-11" />
                  <div className="min-w-[10rem] flex-1">
                    <p className="font-semibold">{p.barbeiro.nome}</p>
                    <p className="text-xs text-aco">
                      {NOME_REMUNERACAO[p.barbeiro.remuneracao]} · {descricaoRemuneracao(p.barbeiro)}
                    </p>
                  </div>
                  <dl className="grid w-full grid-cols-2 gap-x-6 gap-y-2 text-sm sm:w-auto sm:flex-[2] sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-aco">Atendeu</dt>
                      <dd className="font-semibold tabular-nums">
                        {reais(p.faturamento)} <span className="font-normal text-aco">({p.atendimentos})</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-aco">Ganhou</dt>
                      <dd className="font-semibold tabular-nums">{reais(p.ganho)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-aco">Vales e pagos</dt>
                      <dd className="font-semibold tabular-nums">{reais(p.vales + p.pagos)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-aco">{p.aPagar < 0 ? "Ele deve" : "Falta pagar"}</dt>
                      <dd className={`font-display text-lg font-semibold tabular-nums ${p.aPagar > 0 ? "text-navalha" : ""}`}>
                        {reais(Math.abs(p.aPagar))}
                      </dd>
                    </div>
                  </dl>
                  {p.aPagar > 0 && (
                    <BotaoPagar
                      barbeiroId={p.barbeiro.id}
                      nome={p.barbeiro.nome}
                      valor={p.aPagar}
                      mes={mes}
                      mesRotulo={rotulo}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Cartao titulo="Como pagaram">
          {r.porForma.length === 0 ? (
            <p className="text-sm text-aco">Nada fechado neste mês ainda.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {r.porForma.map((f) => (
                <li key={f.forma}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{NOME_FORMA[f.forma] ?? f.forma}</span>
                    <span className="tabular-nums">{reais(f.valor)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-[#F6F1F1]">
                    <div className="h-2 rounded-full bg-navalha" style={{ width: `${(f.valor / maiorForma) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Serviços que mais renderam">
          {r.porServico.length === 0 ? (
            <p className="text-sm text-aco">Nada fechado neste mês ainda.</p>
          ) : (
            <ol className="flex flex-col gap-2 text-sm">
              {r.porServico.slice(0, 6).map((s) => (
                <li key={s.servico} className="flex justify-between gap-3">
                  <span className="truncate">
                    <span className="font-semibold">{s.servico}</span> <span className="text-aco">× {s.quantidade}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{reais(s.valor)}</span>
                </li>
              ))}
            </ol>
          )}
        </Cartao>

        <Cartao titulo="Lançar">
          <NovoLancamento barbeiros={barbeiros.map((b) => ({ id: b.id, nome: b.nome }))} hoje={hoje} />
        </Cartao>
      </div>

      <Cartao titulo="Despesas, vales e pagamentos do mês" className="mt-6">
        {lista.length === 0 ? (
          <p className="text-sm text-aco">Nenhum lançamento neste mês.</p>
        ) : (
          <ul className="divide-y divide-black/[0.06]">
            {lista.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <span
                  className={`w-24 shrink-0 rounded-full px-2.5 py-1 text-center text-xs font-semibold ${
                    l.tipo === "despesa" ? "bg-rosado/50 text-navalha-escuro" : "bg-[#F6F1F1] text-tinta"
                  }`}
                >
                  {l.tipo === "despesa" ? "Despesa" : l.tipo === "vale" ? "Vale" : "Pagamento"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {l.tipo === "despesa" ? l.descricao : nomeBarbeiro(l.barbeiro_id)}
                  </span>
                  <span className="block text-xs text-aco">
                    {formatarDataBrasilia(new Date(`${l.data}T12:00:00-03:00`))}
                    {l.tipo !== "despesa" && l.descricao && ` · ${l.descricao}`}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{reais(l.valor)}</span>
                <RemoverLancamento id={l.id} />
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
