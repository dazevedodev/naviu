import { createServiceRoleClient } from "@/lib/supabase/server";
import { Aviso, TelaAgendamento, type DadosAgendamento } from "@/components/tela-agendamento";
import { ConfirmarForm } from "./confirmar-form";

export default async function ConfirmarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select(
      "status, data_hora, presenca_confirmada_em, servicos(nome), barbeiros(nome), barbearias(nome, slug, endereco)",
    )
    .eq("cancelamento_token", token)
    .maybeSingle();

  if (!agendamento) {
    return (
      <TelaAgendamento titulo="Agendamento não encontrado" dados={null}>
        <Aviso>Confira se o link do e-mail veio inteiro.</Aviso>
      </TelaAgendamento>
    );
  }

  const dados: DadosAgendamento = {
    barbearia: agendamento.barbearias as unknown as DadosAgendamento["barbearia"],
    servico: (agendamento.servicos as unknown as { nome: string } | null)?.nome,
    barbeiro: (agendamento.barbeiros as unknown as { nome: string } | null)?.nome,
    dataHora: new Date(agendamento.data_hora),
  };
  const encerrado =
    ["cancelado", "concluido", "faltou"].includes(agendamento.status) || dados.dataHora <= new Date();

  return (
    <TelaAgendamento titulo="Você vem?" dados={dados}>
      {encerrado ? (
        <Aviso>Esse horário não está mais em aberto.</Aviso>
      ) : agendamento.presenca_confirmada_em ? (
        <Aviso tom="ok">Presença confirmada. Até lá!</Aviso>
      ) : (
        <ConfirmarForm token={token} />
      )}
    </TelaAgendamento>
  );
}
