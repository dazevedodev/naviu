import type { SupabaseClient } from "@supabase/supabase-js";
import type { Aniversario } from "./aniversario";
import { acessoLiberado } from "./assinatura";
import { horariosLivres } from "./disponibilidade";
import { enviarEmailConfirmacaoCliente, enviarEmailNotificacaoAdmin } from "./email";
import { normalizarTelefone } from "./telefone";
import { hojeISOBrasilia } from "./timezone";

export type OrigemAgendamento = "publico" | "manual" | "agente";

export type NovoAgendamento = {
  barbearia_id: string;
  barbeiro_id: string;
  servico_id: string;
  data_hora: string; // ISO
  nome: string;
  telefone_whatsapp: string;
  email?: string | null;
  aniversario?: Aniversario | null;
};

export type ResultadoAgendamento =
  | { ok: true; id: string; status: string }
  | { ok: false; erro: string; status: number };

// Código do Postgres para "violou a trava de horário" (exclusion constraint
// agendamentos_sem_sobreposicao, migração 0012).
const CONFLITO_DE_HORARIO = "23P01";

function dataISOBrasilia(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(data);
}

// Cria um agendamento com todas as regras de negócio: barbearia ativa,
// serviço e barbeiro da própria barbearia, horário ainda livre, cliente
// reconhecido pelo WhatsApp e e-mails de confirmação. Usado pela página
// pública, pelo painel (agendamento manual) e pelo agente de IA.
//
// Precisa de um client service_role: o cliente final nunca tem sessão e as
// policies de RLS de `clientes`/`agendamentos` só liberam o dono da barbearia.
export async function criarAgendamento(
  supabase: SupabaseClient,
  novo: NovoAgendamento,
  origem: OrigemAgendamento,
): Promise<ResultadoAgendamento> {
  const { data: barbearia } = await supabase
    .from("barbearias")
    .select("nome, endereco, assinatura_status, assinatura_valido_ate")
    .eq("id", novo.barbearia_id)
    .single();

  if (!barbearia) return { ok: false, erro: "Barbearia não encontrada.", status: 404 };

  if (!acessoLiberado(barbearia)) {
    return { ok: false, erro: "O agendamento online desta barbearia está pausado.", status: 403 };
  }

  const [{ data: servico }, { data: barbeiro }] = await Promise.all([
    supabase
      .from("servicos")
      .select("nome, duracao_min, preco")
      .eq("id", novo.servico_id)
      .eq("barbearia_id", novo.barbearia_id)
      .single(),
    supabase
      .from("barbeiros")
      .select("nome")
      .eq("id", novo.barbeiro_id)
      .eq("barbearia_id", novo.barbearia_id)
      .single(),
  ]);

  if (!servico) return { ok: false, erro: "Serviço não encontrado.", status: 404 };
  if (!barbeiro) return { ok: false, erro: "Barbeiro não encontrado.", status: 404 };

  const inicio = new Date(novo.data_hora);
  if (Number.isNaN(inicio.getTime())) {
    return { ok: false, erro: "Horário inválido.", status: 400 };
  }

  // Quem agenda sozinho (site ou agente) só pode pegar um horário da grade
  // que ainda esteja livre. O dono, no painel, pode encaixar fora da grade.
  if (origem !== "manual") {
    const dataISO = dataISOBrasilia(inicio);
    if (dataISO < hojeISOBrasilia()) {
      return { ok: false, erro: "Esse horário já passou. Escolha outro.", status: 409 };
    }
    const livres = await horariosLivres(supabase, {
      barbeiroId: novo.barbeiro_id,
      duracaoServicoMin: servico.duracao_min,
      dataISO,
    });
    if (!livres.some((s) => s.getTime() === inicio.getTime())) {
      return { ok: false, erro: "Esse horário acabou de ser reservado. Escolha outro.", status: 409 };
    }
  }

  // Mesma pessoa (mesmo WhatsApp) na mesma barbearia = mesmo cadastro. O
  // nome é atualizado pro mais recente; e-mail e aniversário só se vierem.
  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .upsert(
      {
        barbearia_id: novo.barbearia_id,
        nome: novo.nome,
        telefone_whatsapp: novo.telefone_whatsapp,
        telefone_normalizado: normalizarTelefone(novo.telefone_whatsapp),
        ...(novo.email ? { email: novo.email } : {}),
        ...(novo.aniversario
          ? { aniversario_dia: novo.aniversario.dia, aniversario_mes: novo.aniversario.mes }
          : {}),
      },
      { onConflict: "barbearia_id,telefone_normalizado" },
    )
    .select("id")
    .single();

  if (erroCliente || !cliente) {
    return { ok: false, erro: "Não foi possível salvar o cliente.", status: 500 };
  }

  const { data: agendamento, error: erroAgendamento } = await supabase
    .from("agendamentos")
    .insert({
      barbearia_id: novo.barbearia_id,
      barbeiro_id: novo.barbeiro_id,
      servico_id: novo.servico_id,
      cliente_id: cliente.id,
      data_hora: inicio.toISOString(),
      status: "confirmado",
    })
    .select("id, status, cancelamento_token")
    .single();

  if (erroAgendamento?.code === CONFLITO_DE_HORARIO) {
    return { ok: false, erro: "Esse horário acabou de ser reservado. Escolha outro.", status: 409 };
  }
  if (erroAgendamento || !agendamento) {
    return { ok: false, erro: "Não foi possível criar o agendamento.", status: 500 };
  }

  const detalhesEmail = {
    barbeariaNome: barbearia.nome,
    barbeariaEndereco: barbearia.endereco,
    barbeiroNome: barbeiro.nome,
    servicoNome: servico.nome,
    dataHora: inicio,
    cancelamentoToken: agendamento.cancelamento_token,
  };

  if (novo.email) {
    await enviarEmailConfirmacaoCliente(novo.email, detalhesEmail);
  }

  // Agendamento criado pelo próprio admin (atendimento por telefone/presencial)
  // não precisa notificar o admin de algo que ele mesmo acabou de fazer.
  if (origem !== "manual") {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("email")
      .eq("barbearia_id", novo.barbearia_id)
      .limit(1)
      .maybeSingle();

    if (usuario?.email) {
      await enviarEmailNotificacaoAdmin(usuario.email, { ...detalhesEmail, clienteNome: novo.nome });
    }
  }

  return { ok: true, id: agendamento.id, status: agendamento.status };
}
