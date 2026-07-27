import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { montarLinkWhatsApp, preencherTemplateMensagem } from "@/lib/whatsapp";
import { formatarDataBrasilia, formatarHoraBrasilia, horarioBrasilia, hojeISOBrasilia } from "@/lib/timezone";
import { AgendamentoRow } from "./agendamento-row";
import type { FormaPagamento } from "@/lib/types";

function inicioFimDoDia() {
  const inicio = horarioBrasilia(hojeISOBrasilia(), "00:00");
  const fim = new Date(inicio.getTime() + 24 * 60 * 60_000);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

const UMA_HORA_MS = 60 * 60_000;

export default async function AgendaPage() {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();
  const { inicio, fim } = inicioFimDoDia();
  const agora = new Date();

  const [{ data: agendamentos }, { data: barbeiros }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select(
        "id, data_hora, status, forma_pagamento, barbeiro_id, servicos(nome, preco), clientes(nome, telefone_whatsapp)",
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

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Agenda de hoje
      </h1>

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

                  const emAndamentoOuFuturo = a.status !== "cancelado" && a.status !== "concluido";
                  const faltaUmaHoraOuMenos =
                    dataHora.getTime() - agora.getTime() <= UMA_HORA_MS &&
                    dataHora.getTime() > agora.getTime();
                  const lembrete = emAndamentoOuFuturo && faltaUmaHoraOuMenos;

                  const variaveis = {
                    cliente: cliente?.nome ?? "",
                    barbearia: barbearia.nome,
                    barbeiro: b.nome,
                    servico: servico?.nome ?? "",
                    data: formatarDataBrasilia(dataHora),
                    hora: formatarHoraBrasilia(dataHora),
                  };
                  const mensagem = preencherTemplateMensagem(
                    lembrete ? barbearia.mensagem_lembrete : barbearia.mensagem_confirmacao,
                    variaveis,
                  );
                  const linkWhatsApp = cliente?.telefone_whatsapp
                    ? montarLinkWhatsApp(cliente.telefone_whatsapp, mensagem)
                    : null;

                  return (
                    <AgendamentoRow
                      key={a.id}
                      id={a.id}
                      hora={variaveis.hora}
                      clienteNome={cliente?.nome ?? ""}
                      clienteTelefone={cliente?.telefone_whatsapp ?? ""}
                      servicoNome={servico?.nome ?? ""}
                      servicoPreco={servico?.preco ?? 0}
                      status={a.status}
                      formaPagamento={a.forma_pagamento as FormaPagamento | null}
                      lembrete={lembrete}
                      linkWhatsApp={linkWhatsApp}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
