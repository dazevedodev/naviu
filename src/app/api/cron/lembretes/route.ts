import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { tokenDaQueryValido } from "@/lib/verificar-token";
import { enviarEmailLembreteCliente } from "@/lib/email";

const UMA_HORA_MS = 60 * 60_000;

// Chamado por um agendador externo (cron-job.org) a cada poucos minutos —
// não é cron nativo da Vercel porque o plano Hobby só permite 1x/dia.
// Pega agendamentos que entraram na janela de "falta ~1h" desde a última
// checagem e ainda não tiveram lembrete enviado.
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
    .not("status", "in", "(cancelado,concluido)")
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

  return NextResponse.json({ processados: agendamentos?.length ?? 0, enviados });
}
