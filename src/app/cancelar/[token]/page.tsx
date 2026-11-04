import { createServiceRoleClient } from "@/lib/supabase/server";
import { NOME_STATUS } from "@/lib/types";
import { Aviso, TelaAgendamento, type DadosAgendamento } from "@/components/tela-agendamento";
import { CancelarForm } from "./cancelar-form";

export default async function CancelarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select("status, data_hora, servicos(nome), barbeiros(nome), barbearias(nome, slug, endereco)")
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
  const jaFinalizado = ["cancelado", "concluido", "faltou"].includes(agendamento.status);

  return (
    <TelaAgendamento titulo="Cancelar horário" dados={dados}>
      {jaFinalizado ? (
        <Aviso>
          Esse horário está como{" "}
          <strong>{(NOME_STATUS[agendamento.status] ?? agendamento.status).toLowerCase()}</strong> e
          não pode mais ser cancelado por aqui.
        </Aviso>
      ) : (
        <CancelarForm token={token} slug={dados.barbearia?.slug} />
      )}
    </TelaAgendamento>
  );
}
