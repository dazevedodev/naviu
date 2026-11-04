import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { diasAteAniversario } from "@/lib/aniversario-proximo";
import { formatarAniversario } from "@/lib/aniversario";
import { reais } from "@/lib/financeiro";
import { formatarHoraBrasilia, horarioBrasilia, hojeISOBrasilia } from "@/lib/timezone";
import { carregarAgenda } from "./agenda/dados";
import { ListaHorarios } from "./agenda/visao-agenda";
import { BOTAO, Cartao, Iniciais, Numero, Vazio, linkWhatsApp } from "./ui";

const DIAS_ANIVERSARIO = 7;

function saudacao() {
  const hora = Number(formatarHoraBrasilia(new Date()).slice(0, 2));
  return hora >= 5 && hora < 12 ? "Bom dia" : hora >= 12 && hora < 18 ? "Boa tarde" : "Boa noite";
}

// Tela de início do painel: o dia de hoje, quanto entrou e quem faz
// aniversário. O resto fica a um toque, no menu.
export default async function InicioPage() {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();
  const hoje = hojeISOBrasilia();
  const inicioMes = horarioBrasilia(`${hoje.slice(0, 8)}01`, "00:00").toISOString();

  const [{ data: barbeiros }, { count: totalServicos }, itensHoje, { data: doMes }, { data: clientes }] =
    await Promise.all([
      supabase
        .from("barbeiros")
        .select("id, nome, foto_url")
        .eq("barbearia_id", barbearia.id)
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("servicos")
        .select("id", { count: "exact", head: true })
        .eq("barbearia_id", barbearia.id)
        .eq("ativo", true),
      carregarAgenda(supabase, barbearia.id, hoje, 1),
      supabase
        .from("agendamentos")
        .select("valor_cobrado")
        .eq("barbearia_id", barbearia.id)
        .eq("status", "concluido")
        .gte("data_hora", inicioMes),
      supabase
        .from("clientes")
        .select("id, nome, telefone_whatsapp, aniversario_dia, aniversario_mes")
        .eq("barbearia_id", barbearia.id)
        .not("aniversario_mes", "is", null),
    ]);

  const ativosHoje = itensHoje.filter((i) => i.status !== "cancelado");
  const atendidosHoje = ativosHoje.filter((i) => i.status === "concluido");
  const faturadoHoje = atendidosHoje.reduce((t, i) => t + (i.valorCobrado ?? 0), 0);
  const faturadoMes = (doMes ?? []).reduce((t, a) => t + Number(a.valor_cobrado ?? 0), 0);
  const aFazer = ativosHoje.filter((i) => i.status === "pendente" || i.status === "confirmado");

  const aniversariantes = (clientes ?? [])
    .map((c) => ({ ...c, faltam: diasAteAniversario(hoje, c.aniversario_dia!, c.aniversario_mes!) }))
    .filter((c) => c.faltam < DIAS_ANIVERSARIO)
    .sort((a, b) => a.faltam - b.faltam);

  const configurando = !barbeiros?.length || !totalServicos;
  const dataHoje = new Date(`${hoje}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-aco first-letter:uppercase">{dataHoje}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">{saudacao()}!</h1>
        </div>
        <Link href="/admin/novo-agendamento" className={BOTAO}>
          + Novo horário
        </Link>
      </div>

      {configurando && (
        <Cartao titulo="Falta pouco para abrir a agenda" className="mb-6 ring-2 ring-navalha">
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              {barbeiros?.length ? "✓" : "○"}{" "}
              <Link href="/admin/barbeiros" className="font-semibold text-navalha hover:underline">
                Cadastre os barbeiros
              </Link>{" "}
              e os horários de cada um
            </li>
            <li>
              {totalServicos ? "✓" : "○"}{" "}
              <Link href="/admin/servicos" className="font-semibold text-navalha hover:underline">
                Cadastre os serviços
              </Link>{" "}
              com preço e duração
            </li>
          </ul>
        </Cartao>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Hoje" valor={String(ativosHoje.length)} detalhe={ativosHoje.length === 1 ? "horário" : "horários"} />
        <Numero rotulo="Atendidos" valor={String(atendidosHoje.length)} detalhe={`faltam ${aFazer.length}`} />
        <Numero rotulo="Entrou hoje" valor={reais(faturadoHoje)} />
        <Numero rotulo="Entrou no mês" valor={reais(faturadoMes)} destaque />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Cartao titulo="Agenda de hoje" acao={{ href: "/admin/agenda", texto: "Ver agenda" }}>
          {ativosHoje.length ? (
            <ListaHorarios barbeiros={barbeiros ?? []} itens={ativosHoje} />
          ) : (
            <Vazio>Nenhum horário hoje. Divulgue seu link: naviu.app.br/{barbearia.slug}</Vazio>
          )}
        </Cartao>

        <Cartao titulo="Aniversários" acao={{ href: "/admin/clientes?aniversario=mes", texto: "Do mês" }}>
          {aniversariantes.length ? (
            <ul className="flex flex-col gap-3">
              {aniversariantes.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <Iniciais nome={c.nome} />
                  <span className="min-w-0 flex-1">
                    <Link href={`/admin/clientes/${c.id}`} className="block truncate font-semibold hover:underline">
                      {c.nome}
                    </Link>
                    <span className="block text-xs text-aco">
                      {c.faltam === 0
                        ? "Hoje!"
                        : c.faltam === 1
                          ? "Amanhã"
                          : `${formatarAniversario(c.aniversario_dia!, c.aniversario_mes!)}, em ${c.faltam} dias`}
                    </span>
                  </span>
                  <a
                    href={linkWhatsApp(
                      c.telefone_whatsapp,
                      `Feliz aniversário, ${c.nome.split(" ")[0]}! Um abraço de toda a equipe da ${barbearia.nome}.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-full bg-[#F6F1F1] px-3 py-1.5 text-xs font-semibold text-navalha hover:bg-rosado/60"
                  >
                    Dar parabéns
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-aco">Ninguém faz aniversário nos próximos 7 dias.</p>
          )}
        </Cartao>
      </div>
    </div>
  );
}
