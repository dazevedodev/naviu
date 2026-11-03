import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { tokenDaQueryValido } from "@/lib/verificar-token";
import { enviarEmailLembreteCliente, enviarEmailPedidoConfirmacao } from "@/lib/email";
import { HORAS_CONFIRMACAO, precisaPedirConfirmacao } from "@/lib/presenca";

const UMA_HORA_MS = 60 * 60_000;

// Chamado por um agendador externo (cron-job.org) a cada poucos minutos —
// não é cron nativo da Vercel porque o plano Hobby só permite 1x/dia.
// Duas tarefas: o pedido de confirmação de presença (falta até 24h) e o
// lembrete de 1h antes, cada um enviado uma vez só por agendamento.
export async function GET(request: NextRequest) {
  if (!tokenDaQueryValido(request, "CRON_SECRET")) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const agora = new Date();
  const emUmaHora = new Date(agora.getTime() + UMA_HORA_MS);

  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select(
      "id, data_hora, cancelamento_token, clientes(nome, email), servicos(nome), barbeiros(nome), barbearias(nome, endereco)",
    )
    .eq("lembrete_enviado", false)
    .not("status", "in", "(cancelado,concluido,faltou)")
    .gt("data_hora", agora.toISOString())
    .lte("data_hora", emUmaHora.toISOString());

  let enviados = 0;

  for (const a of agendamentos ?? []) {
    const cliente = a.clientes as unknown as { nome: string; email: string | null } | null;
    const servico = a.servicos as unknown as { nome: string } | null;
    const barbeiro = a.barbeiros as unknown as { nome: string } | null;
    const barbearia = a.barbearias as unknown as { nome: string; endereco: string | null } | null;

    if (cliente?.email) {
      await enviarEmailLembreteCliente(cliente.email, {
        barbeariaNome: barbearia?.nome ?? "",
        barbeariaEndereco: barbearia?.endereco ?? null,
        barbeiroNome: barbeiro?.nome ?? "",
        servicoNome: servico?.nome ?? "",
        dataHora: new Date(a.data_hora),
        cancelamentoToken: a.cancelamento_token,
      });
      enviados++;
    }

    await supabase.from("agendamentos").update({ lembrete_enviado: true }).eq("id", a.id);
  }

  const confirmacoes = await pedirConfirmacoes(supabase, agora);

  return NextResponse.json({ processados: agendamentos?.length ?? 0, enviados, confirmacoes });
}

async function pedirConfirmacoes(
  supabase: ReturnType<typeof createServiceRoleClient>,
  agora: Date,
): Promise<number> {
  const limite = new Date(agora.getTime() + HORAS_CONFIRMACAO * UMA_HORA_MS);
  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select(
      "id, data_hora, criado_em, cancelamento_token, clientes(email), servicos(nome), barbeiros(nome), barbearias(nome, endereco)",
    )
    .eq("confirmacao_enviada", false)
    .is("presenca_confirmada_em", null)
    .not("status", "in", "(cancelado,concluido,faltou)")
    .gt("data_hora", agora.toISOString())
    .lte("data_hora", limite.toISOString());

  let enviados = 0;
  for (const a of agendamentos ?? []) {
    if (!precisaPedirConfirmacao(a, agora)) continue;
    const cliente = a.clientes as unknown as { email: string | null } | null;
    const servico = a.servicos as unknown as { nome: string } | null;
    const barbeiro = a.barbeiros as unknown as { nome: string } | null;
    const barbearia = a.barbearias as unknown as { nome: string; endereco: string | null } | null;

    if (cliente?.email) {
      await enviarEmailPedidoConfirmacao(cliente.email, {
        barbeariaNome: barbearia?.nome ?? "",
        barbeariaEndereco: barbearia?.endereco ?? null,
        barbeiroNome: barbeiro?.nome ?? "",
        servicoNome: servico?.nome ?? "",
        dataHora: new Date(a.data_hora),
        cancelamentoToken: a.cancelamento_token,
      });
      enviados++;
    }
    await supabase.from("agendamentos").update({ confirmacao_enviada: true }).eq("id", a.id);
  }
  return enviados;
}
