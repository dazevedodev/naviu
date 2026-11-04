import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { formatarAniversario } from "@/lib/aniversario";
import { reais } from "@/lib/financeiro";
import { DIAS_DESCANSO_CHAMADO, DIAS_SUMIDO, limiteSumido, mensagemVolta, situacaoSumido } from "@/lib/sumidos";
import { formatarDataBrasilia, hojeISOBrasilia } from "@/lib/timezone";
import { BotaoChamar } from "./botao-chamar";
import { Cabecalho, CAMPO, Iniciais, Vazio, linkWhatsApp } from "../ui";

type Resumo = {
  id: string;
  nome: string;
  telefone_whatsapp: string;
  aniversario_dia: number | null;
  aniversario_mes: number | null;
  visitas: number;
  gasto: number;
  faltas: number;
  ultima_visita: string | null;
  proximo_horario: string | null;
  chamado_em?: string | null;
};

const ORDENS = {
  recentes: {
    nome: "Últimas visitas",
    coluna: "ultima_visita",
    crescente: false,
  },
  gasto: { nome: "Quem mais gasta", coluna: "gasto", crescente: false },
  nome: { nome: "Nome", coluna: "nome", crescente: true },
} as const;

const POR_PAGINA = 50;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    aniversario?: string;
    sumidos?: string;
    ordem?: string;
    pagina?: string;
  }>;
}) {
  const filtros = await searchParams;
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const ordem = ORDENS[(filtros.ordem as keyof typeof ORDENS) ?? "recentes"] ?? ORDENS.recentes;
  const chaveOrdem = (Object.keys(ORDENS) as (keyof typeof ORDENS)[]).find((k) => ORDENS[k] === ordem)!;
  const doMes = filtros.aniversario === "mes";
  const sumidos = filtros.sumidos === "1" && !doMes;
  const agora = new Date();
  const mesAtual = Number(hojeISOBrasilia().slice(5, 7));
  const pagina = Math.max(1, Number(filtros.pagina) || 1);
  const busca = (filtros.q ?? "").trim().slice(0, 60);

  let consulta = supabase.from("clientes_resumo").select("*", { count: "exact" }).eq("barbearia_id", barbearia.id);
  if (busca) {
    const digitos = busca.replace(/\D/g, "");
    // Busca por nome ou pelos números do WhatsApp. Vírgula e parênteses
    // separam filtros na URL do banco, então saem do texto.
    const texto = busca.replace(/[,()*%]/g, " ");
    consulta =
      digitos.length >= 3
        ? consulta.or(`nome.ilike.%${texto}%,telefone_whatsapp.ilike.%${digitos}%`)
        : consulta.ilike("nome", `%${texto}%`);
  }
  if (sumidos) {
    // Quem já veio, não tem horário marcado e não volta há DIAS_SUMIDO dias.
    // Quem foi chamado há pouco sai da lista (veja situacaoSumido).
    const limiteChamado = new Date(agora.getTime() - DIAS_DESCANSO_CHAMADO * 86_400_000).toISOString();
    consulta = consulta
      .gte("visitas", 1)
      .is("proximo_horario", null)
      .lt("ultima_visita", limiteSumido(agora))
      .or(`chamado_em.is.null,chamado_em.lt.${limiteChamado}`)
      .order("ultima_visita", { ascending: false });
  } else if (doMes) {
    consulta = consulta.eq("aniversario_mes", mesAtual).order("aniversario_dia");
  } else {
    consulta = consulta.order(ordem.coluna, {
      ascending: ordem.crescente,
      nullsFirst: false,
    });
  }
  const { data, count } = await consulta.range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  const clientes = (data ?? []) as Resumo[];
  const total = count ?? 0;

  const link = (mudar: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base = {
      q: busca || undefined,
      aniversario: doMes ? "mes" : undefined,
      sumidos: sumidos ? "1" : undefined,
      ordem: chaveOrdem,
      ...mudar,
    };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return `/admin/clientes?${p}`;
  };

  return (
    <div>
      <Cabecalho titulo="Clientes" descricao={total === 1 ? "1 cliente" : `${total} clientes`} />

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/clientes">
        <input
          type="search"
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome ou WhatsApp"
          aria-label="Buscar cliente"
          className={`${CAMPO} max-w-sm flex-1 rounded-full px-4`}
        />
        {doMes && <input type="hidden" name="aniversario" value="mes" />}
        {sumidos && <input type="hidden" name="sumidos" value="1" />}
        <input type="hidden" name="ordem" value={chaveOrdem} />
      </form>

      <div className="mb-4 flex flex-wrap gap-2 text-sm font-semibold">
        {(Object.keys(ORDENS) as (keyof typeof ORDENS)[]).map((k) => (
          <Link
            key={k}
            href={link({
              ordem: k,
              aniversario: undefined,
              sumidos: undefined,
              pagina: undefined,
            })}
            className={`rounded-full px-4 py-2 ${!doMes && !sumidos && chaveOrdem === k ? "bg-tinta text-white" : "bg-white hover:bg-rosado/40"}`}
          >
            {ORDENS[k].nome}
          </Link>
        ))}
        <Link
          href={link({
            aniversario: "mes",
            sumidos: undefined,
            pagina: undefined,
          })}
          className={`rounded-full px-4 py-2 ${doMes ? "bg-navalha text-white" : "bg-white hover:bg-rosado/40"}`}
        >
          Aniversariantes do mês
        </Link>
        <Link
          href={link({
            sumidos: "1",
            aniversario: undefined,
            pagina: undefined,
          })}
          className={`rounded-full px-4 py-2 ${sumidos ? "bg-navalha text-white" : "bg-white hover:bg-rosado/40"}`}
        >
          Sumidos
        </Link>
      </div>

      {sumidos && (
        <p className="mb-4 max-w-2xl text-sm text-aco">
          Quem não volta há mais de {DIAS_SUMIDO} dias e não tem horário marcado. Em Chamar, o WhatsApp abre com uma
          mensagem pronta e o cliente sai desta lista por {DIAS_DESCANSO_CHAMADO} dias.
        </p>
      )}

      {clientes.length === 0 ? (
        <Vazio>
          {busca
            ? "Nenhum cliente com esse nome ou número."
            : sumidos
              ? "Ninguém sumido: quem veio voltou ou já tem horário marcado."
              : doMes
                ? "Ninguém com aniversário cadastrado neste mês."
                : "Os clientes aparecem aqui assim que marcarem o primeiro horário."}
        </Vazio>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white">
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-black/[0.06] text-xs uppercase tracking-[0.1em] text-aco md:table-header-group">
              <tr>
                <th className="px-5 py-3 font-semibold">Cliente</th>
                <th className="px-3 py-3 font-semibold">Visitas</th>
                <th className="px-3 py-3 font-semibold">Gastou</th>
                <th className="px-3 py-3 font-semibold">Última visita</th>
                <th className="px-3 py-3 font-semibold">Aniversário</th>
                {sumidos && <th className="px-3 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {clientes.map((c) => {
                const sumido = situacaoSumido(c, agora);
                return (
                  <tr key={c.id} className="relative hover:bg-[#FBF8F8]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/clientes/${c.id}`}
                          className="flex min-w-0 flex-1 items-center gap-3 after:absolute after:inset-0"
                        >
                          <Iniciais nome={c.nome} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {c.nome}
                              {c.faltas > 0 && (
                                <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                  {c.faltas === 1 ? "1 falta" : `${c.faltas} faltas`}
                                </span>
                              )}
                              {sumido && (
                                <span className="mt-1 block w-fit rounded-full bg-rosado/50 px-2 py-0.5 text-xs font-semibold text-navalha-escuro md:ml-2 md:mt-0 md:inline">
                                  {sumido.tipo === "uma_vez" ? "Veio só 1 vez" : "Cliente fiel"} · {sumido.dias} dias
                                  sem vir
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-aco">
                              {c.telefone_whatsapp}
                              <span className="md:hidden">
                                {" "}
                                · {c.visitas} {c.visitas === 1 ? "visita" : "visitas"} · {reais(Number(c.gasto))}
                              </span>
                            </span>
                          </span>
                        </Link>
                        {/* No celular a tabela só tem esta coluna: o botão vem junto. */}
                        {sumidos && sumido && (
                          <span className="md:hidden">
                            <BotaoChamar
                              id={c.id}
                              href={linkWhatsApp(
                                c.telefone_whatsapp,
                                mensagemVolta(sumido, c.nome, barbearia.nome, barbearia.slug),
                              )}
                            />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 tabular-nums md:table-cell">{c.visitas}</td>
                    <td className="hidden px-3 py-3 tabular-nums md:table-cell">{reais(Number(c.gasto))}</td>
                    <td className="hidden px-3 py-3 text-aco md:table-cell">
                      {c.ultima_visita ? formatarDataBrasilia(new Date(c.ultima_visita)) : "—"}
                    </td>
                    <td className="hidden px-3 py-3 text-aco md:table-cell">
                      {c.aniversario_dia && c.aniversario_mes
                        ? formatarAniversario(c.aniversario_dia, c.aniversario_mes)
                        : "—"}
                    </td>
                    {sumidos && (
                      <td className="hidden px-3 py-3 text-right md:table-cell">
                        {sumido && (
                          <BotaoChamar
                            id={c.id}
                            href={linkWhatsApp(
                              c.telefone_whatsapp,
                              mensagemVolta(sumido, c.nome, barbearia.nome, barbearia.slug),
                            )}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > POR_PAGINA && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm font-semibold">
          {pagina > 1 && (
            <Link href={link({ pagina: String(pagina - 1) })} className="rounded-full bg-white px-4 py-2">
              ‹ Anterior
            </Link>
          )}
          <span className="text-aco">
            Página {pagina} de {Math.ceil(total / POR_PAGINA)}
          </span>
          {pagina * POR_PAGINA < total && (
            <Link href={link({ pagina: String(pagina + 1) })} className="rounded-full bg-white px-4 py-2">
              Próxima ›
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
