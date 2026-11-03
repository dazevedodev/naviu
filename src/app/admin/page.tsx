import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { formatarHoraBrasilia, horarioBrasilia, hojeISOBrasilia } from "@/lib/timezone";
import { alertaDoHistorico, resumirHistorico, type ItemHistorico } from "@/lib/presenca";
import { AgendamentoRow } from "./agendamento-row";
import { ListaEspera } from "./lista-espera";
import type { FormaPagamento } from "@/lib/types";

function inicioFimDoDia() {
  const inicio = horarioBrasilia(hojeISOBrasilia(), "00:00");
  const fim = new Date(inicio.getTime() + 24 * 60 * 60_000);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

export default async function AgendaPage() {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();
  const { inicio, fim } = inicioFimDoDia();

  const [{ data: agendamentos }, { data: barbeiros }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(
        "id, data_hora, status, forma_pagamento, barbeiro_id, cliente_id, presenca_confirmada_em, servicos(nome, preco), clientes(nome, telefone_whatsapp)",
      )
      .eq("barbearia_id", barbearia.id)
      .gte("data_hora", inicio)
      .lt("data_hora", fim)
      .order("data_hora", { ascending: true }),
    supabase
      .from("barbeiros")
      .select("id, nome")
      .eq("barbearia_id", barbearia.id)
      .eq("ativo", true)
      .order("nome"),
  ]);

  // Histórico de quem tem horário hoje: faltas e cancelamentos em cima da
  // hora aparecem ao lado do nome, para o barbeiro saber com quem lida.
  const clienteIds = [...new Set((agendamentos ?? []).map((a) => a.cliente_id).filter(Boolean))];
  const [{ data: historico }, { data: espera }] = await Promise.all([
    clienteIds.length
      ? supabase
          .from("agendamentos")
          .select("cliente_id, status, data_hora, cancelado_em, cancelado_por")
          .eq("barbearia_id", barbearia.id)
          .in("cliente_id", clienteIds)
      : Promise.resolve({ data: [] as (ItemHistorico & { cliente_id: string })[] }),
    supabase
      .from("lista_espera")
      .select("id, data, periodo, nome, telefone_whatsapp, avisado_em, servicos(nome), barbeiros(nome)")
      .eq("barbearia_id", barbearia.id)
      .gte("data", hojeISOBrasilia())
      .order("data")
      .order("criado_em"),
  ]);
  const alertaPorCliente = new Map(
    clienteIds.map((id) => [
      id,
      alertaDoHistorico(resumirHistorico((historico ?? []).filter((h) => h.cliente_id === id))),
    ]),
  );
  const agora = new Date();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Agenda de hoje
        </h1>
        <Link
          href="/admin/novo-agendamento"
          className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          + Novo agendamento
        </Link>
      </div>

      {!agendamentos?.length && (
        <p className="text-sm text-zinc-500">Nenhum agendamento para hoje.</p>
      )}

      <div className="flex flex-col gap-8">
        {barbeiros?.map((b) => {
          const doBarbeiro = (agendamentos ?? []).filter((a) => a.barbeiro_id === b.id);
          if (doBarbeiro.length === 0) return null;

          return (
            <div key={b.id}>
              <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {b.nome}
              </h2>
              <div className="flex flex-col gap-2">
                {doBarbeiro.map((a) => {
                  const cliente = a.clientes as unknown as {
                    nome: string;
                    telefone_whatsapp: string;
                  };
                  const servico = a.servicos as unknown as { nome: string; preco: number };
                  const dataHora = new Date(a.data_hora);

                  return (
                    <AgendamentoRow
                      key={a.id}
                      id={a.id}
                      hora={formatarHoraBrasilia(dataHora)}
                      clienteNome={cliente?.nome ?? ""}
                      clienteTelefone={cliente?.telefone_whatsapp ?? ""}
                      servicoNome={servico?.nome ?? ""}
                      servicoPreco={servico?.preco ?? 0}
                      status={a.status}
                      formaPagamento={a.forma_pagamento as FormaPagamento | null}
                      alertaHistorico={alertaPorCliente.get(a.cliente_id) ?? null}
                      presencaConfirmada={Boolean(a.presenca_confirmada_em)}
                      jaComecou={dataHora <= agora}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

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
