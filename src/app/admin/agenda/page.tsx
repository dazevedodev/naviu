import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { diaSemanaDeData, formatarHoraBrasilia, hojeISOBrasilia } from "@/lib/timezone";
import { ListaEspera } from "../lista-espera";
import { BOTAO, Cabecalho } from "../ui";
import { carregarAgenda, dataValida, inicioDaSemana, somarDias } from "./dados";
import { AgendaDia, AgendaSemana } from "./visao-agenda";

const paraMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; modo?: string; barbeiro?: string }>;
}) {
  const filtros = await searchParams;
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const hoje = hojeISOBrasilia();
  const data = dataValida(filtros.data) ? filtros.data : hoje;
  const semana = filtros.modo === "semana";
  const primeiroDia = semana ? inicioDaSemana(data) : data;
  const dias = semana ? Array.from({ length: 7 }, (_, i) => somarDias(primeiroDia, i)) : [data];

  const [{ data: todosBarbeiros }, { data: horarios }, itens, { data: espera }] = await Promise.all([
    supabase
      .from("barbeiros")
      .select("id, nome, foto_url")
      .eq("barbearia_id", barbearia.id)
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("horarios_trabalho")
      .select("barbeiro_id, dia_semana, hora_inicio, hora_fim, horarios_manuais, barbeiros!inner(barbearia_id)")
      .eq("barbeiros.barbearia_id", barbearia.id),
    carregarAgenda(supabase, barbearia.id, primeiroDia, dias.length),
    supabase
      .from("lista_espera")
      .select("id, data, periodo, nome, telefone_whatsapp, avisado_em, servicos(nome), barbeiros(nome)")
      .eq("barbearia_id", barbearia.id)
      .gte("data", hoje)
      .order("data")
      .order("criado_em"),
  ]);

  const barbeiros = (todosBarbeiros ?? []).filter((b) => !filtros.barbeiro || b.id === filtros.barbeiro);
  const itensFiltrados = itens.filter((i) => barbeiros.some((b) => b.id === i.barbeiroId));

  // Faixa de horas do dia: do primeiro barbeiro que abre ao último que fecha
  // (8h às 20h se ninguém tiver horário cadastrado), sempre cobrindo os
  // horários marcados.
  const doDia = (horarios ?? []).filter((h) => h.dia_semana === diaSemanaDeData(data));
  const marcas = [
    ...doDia.flatMap((h) => [h.hora_inicio, h.hora_fim, ...(h.horarios_manuais ?? [])]),
    ...itensFiltrados.flatMap((i) => [
      formatarHoraBrasilia(new Date(i.inicio)),
      formatarHoraBrasilia(new Date(new Date(i.inicio).getTime() + i.duracao * 60_000)),
    ]),
  ]
    .filter((h): h is string => Boolean(h))
    .map((h) => paraMinutos(h.slice(0, 5)));
  const faixa = {
    inicio: Math.floor(Math.min(8 * 60, ...marcas) / 60) * 60,
    fim: Math.min(24 * 60, Math.ceil(Math.max(20 * 60, ...marcas) / 60) * 60),
  };
  const agoraMin = data === hoje ? paraMinutos(formatarHoraBrasilia(new Date())) : null;

  const passo = semana ? 7 : 1;
  const url = (novaData: string, modo = semana ? "semana" : "dia") => {
    const p = new URLSearchParams({ data: novaData });
    if (modo === "semana") p.set("modo", "semana");
    if (filtros.barbeiro) p.set("barbeiro", filtros.barbeiro);
    return `/admin/agenda?${p}`;
  };

  const titulo = semana
    ? `Semana de ${new Date(`${primeiroDia}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" })}`
    : data === hoje
      ? "Hoje"
      : new Date(`${data}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  const ativos = itensFiltrados.filter((i) => i.status !== "cancelado");

  return (
    <div>
      <Cabecalho
        titulo={titulo.charAt(0).toUpperCase() + titulo.slice(1)}
        descricao={ativos.length === 1 ? "1 horário marcado" : `${ativos.length} horários marcados`}
      >
        <Link href="/admin/novo-agendamento" className={BOTAO}>
          + Novo horário
        </Link>
      </Cabecalho>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-full bg-white p-1">
          <Link href={url(somarDias(data, -passo))} aria-label="Anterior" className="rounded-full px-3 py-1.5 text-lg leading-none hover:bg-[#F6F1F1]">
            ‹
          </Link>
          <Link href={url(hoje)} className="rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-[#F6F1F1]">
            Hoje
          </Link>
          <Link href={url(somarDias(data, passo))} aria-label="Próximo" className="rounded-full px-3 py-1.5 text-lg leading-none hover:bg-[#F6F1F1]">
            ›
          </Link>
        </div>

        <div className="flex rounded-full bg-white p-1 text-sm font-semibold">
          {[
            { modo: "dia", nome: "Dia" },
            { modo: "semana", nome: "Semana" },
          ].map((m) => (
            <Link
              key={m.modo}
              href={url(data, m.modo)}
              aria-current={(m.modo === "semana") === semana ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 ${(m.modo === "semana") === semana ? "bg-tinta text-white" : "hover:bg-[#F6F1F1]"}`}
            >
              {m.nome}
            </Link>
          ))}
        </div>

        {(todosBarbeiros ?? []).length > 1 && (
          <div className="flex flex-wrap rounded-full bg-white p-1 text-sm font-semibold">
            {[{ id: "", nome: "Todos" }, ...(todosBarbeiros ?? [])].map((b) => {
              const p = new URLSearchParams({ data });
              if (semana) p.set("modo", "semana");
              if (b.id) p.set("barbeiro", b.id);
              const atual = (filtros.barbeiro ?? "") === b.id;
              return (
                <Link
                  key={b.id || "todos"}
                  href={`/admin/agenda?${p}`}
                  className={`rounded-full px-3 py-1.5 ${atual ? "bg-navalha text-white" : "hover:bg-[#F6F1F1]"}`}
                >
                  {b.nome.split(" ")[0]}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {semana ? (
        <AgendaSemana dias={dias} hoje={hoje} barbeiros={barbeiros} itens={itensFiltrados} />
      ) : (
        <AgendaDia barbeiros={barbeiros} itens={itensFiltrados} faixa={faixa} agoraMin={agoraMin} />
      )}

      <ListaEspera
        itens={(espera ?? []).map((e) => ({
          id: e.id,
          data: e.data,
          periodo: e.periodo,
          nome: e.nome,
          telefone: e.telefone_whatsapp,
          avisado: Boolean(e.avisado_em),
          servico: (e.servicos as unknown as { nome: string } | null)?.nome ?? "",
          barbeiro: (e.barbeiros as unknown as { nome: string } | null)?.nome ?? null,
        }))}
      />
    </div>
  );
}
