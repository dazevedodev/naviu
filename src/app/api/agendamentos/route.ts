import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { enviarEmailConfirmacaoCliente, enviarEmailNotificacaoAdmin } from "@/lib/email";
import { acessoLiberado } from "@/lib/assinatura";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    barbearia_id,
    barbeiro_id,
    servico_id,
    data_hora,
    nome,
    telefone_whatsapp,
    email,
    origem, // "publico" (padrão, cliente pela página pública) | "manual" (admin criou)
  } = body;

  if (
    !barbearia_id ||
    !barbeiro_id ||
    !servico_id ||
    !data_hora ||
    !nome ||
    !telefone_whatsapp
  ) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  // Fluxo 100% público/anônimo: usa service_role porque as policies de RLS de
  // `clientes`/`agendamentos` só liberam SELECT pro dono da barbearia (o
  // cliente final nunca tem sessão), e o insert().select() precisa ler a
  // própria linha de volta. Toda a validação de negócio já acontece abaixo.
  const supabase = createServiceRoleClient();

  const { data: barbearia } = await supabase
    .from("barbearias")
    .select("nome, endereco, assinatura_status, assinatura_valido_ate")
    .eq("id", barbearia_id)
    .single();

  if (!barbearia) {
    return NextResponse.json({ error: "Barbearia não encontrada." }, { status: 404 });
  }

  if (!acessoLiberado(barbearia)) {
    return NextResponse.json(
      { error: "O agendamento online desta barbearia está pausado." },
      { status: 403 },
    );
  }

  const { data: servico } = await supabase
    .from("servicos")
    .select("nome, duracao_min, preco")
    .eq("id", servico_id)
    .single();

  if (!servico) {
    return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
  }

  const { data: barbeiro } = await supabase
    .from("barbeiros")
    .select("nome")
    .eq("id", barbeiro_id)
    .single();

  // Revalida conflito no momento da escrita (checagem best-effort — não é
  // atômica, mas cobre o caso comum de dois clientes disputando o mesmo horário).
  const inicio = new Date(data_hora);
  const fim = new Date(inicio.getTime() + servico.duracao_min * 60_000);
  const { data: conflitos } = await supabase
    .from("agendamentos")
    .select("id, data_hora, servicos(duracao_min)")
    .eq("barbeiro_id", barbeiro_id)
    .neq("status", "cancelado")
    .gte("data_hora", new Date(inicio.getTime() - 4 * 60 * 60_000).toISOString())
    .lt("data_hora", fim.toISOString());

  const temConflito = (conflitos ?? []).some((a) => {
    const outroInicio = new Date(a.data_hora);
    const outraDuracao =
      (a.servicos as unknown as { duracao_min: number } | null)?.duracao_min ?? 30;
    const outroFim = new Date(outroInicio.getTime() + outraDuracao * 60_000);
    return inicio < outroFim && fim > outroInicio;
  });

  if (temConflito) {
    return NextResponse.json(
      { error: "Esse horário acabou de ser reservado. Escolha outro." },
      { status: 409 },
    );
  }

  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .insert({ nome, telefone_whatsapp, email: email || null })
    .select("id")
    .single();

  if (erroCliente || !cliente) {
    return NextResponse.json({ error: "Não foi possível salvar o cliente." }, { status: 500 });
  }

  const { data: agendamento, error: erroAgendamento } = await supabase
    .from("agendamentos")
    .insert({
      barbearia_id,
      barbeiro_id,
      servico_id,
      cliente_id: cliente.id,
      data_hora,
      status: "confirmado",
    })
    .select("id, status, cancelamento_token")
    .single();

  if (erroAgendamento || !agendamento) {
    return NextResponse.json(
      { error: "Não foi possível criar o agendamento." },
      { status: 500 },
    );
  }

  const detalhesEmail = {
    barbeariaNome: barbearia.nome,
    barbeariaEndereco: barbearia.endereco,
    barbeiroNome: barbeiro?.nome ?? "",
    servicoNome: servico.nome,
    dataHora: inicio,
    cancelamentoToken: agendamento.cancelamento_token,
  };

  if (email) {
    await enviarEmailConfirmacaoCliente(email, detalhesEmail);
  }

  // Agendamento criado pelo próprio admin (atendimento por telefone/presencial)
  // não precisa notificar o admin de algo que ele mesmo acabou de fazer.
  if (origem !== "manual") {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("email")
      .eq("barbearia_id", barbearia_id)
      .limit(1)
      .maybeSingle();

    if (usuario?.email) {
      await enviarEmailNotificacaoAdmin(usuario.email, { ...detalhesEmail, clienteNome: nome });
    }
  }

  return NextResponse.json({ id: agendamento.id, status: agendamento.status });
}
