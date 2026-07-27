import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { barbearia_id, barbeiro_id, servico_id, data_hora, nome, telefone_whatsapp } = body;

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
    .select("sinal_ativo, sinal_tipo, sinal_valor")
    .eq("id", barbearia_id)
    .single();

  if (!barbearia) {
    return NextResponse.json({ error: "Barbearia não encontrada." }, { status: 404 });
  }

  const { data: servico } = await supabase
    .from("servicos")
    .select("duracao_min, preco")
    .eq("id", servico_id)
    .single();

  if (!servico) {
    return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
  }

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
    .insert({ nome, telefone_whatsapp })
    .select("id")
    .single();

  if (erroCliente || !cliente) {
    return NextResponse.json({ error: "Não foi possível salvar o cliente." }, { status: 500 });
  }

  const sinalValor = barbearia.sinal_ativo
    ? barbearia.sinal_tipo === "percentual"
      ? Number(((servico.preco * barbearia.sinal_valor) / 100).toFixed(2))
      : barbearia.sinal_valor
    : null;

  const { data: agendamento, error: erroAgendamento } = await supabase
    .from("agendamentos")
    .insert({
      barbearia_id,
      barbeiro_id,
      servico_id,
      cliente_id: cliente.id,
      data_hora,
      status: barbearia.sinal_ativo ? "aguardando_sinal" : "confirmado",
      sinal_valor: sinalValor,
    })
    .select("id, status")
    .single();

  if (erroAgendamento || !agendamento) {
    return NextResponse.json(
      { error: "Não foi possível criar o agendamento." },
      { status: 500 },
    );
  }

  // TODO: se sinal_ativo, gerar cobrança PIX (Pagar.me/Mercado Pago) e devolver
  // o QR code aqui; um job separado deve expirar o agendamento se o sinal não
  // for pago dentro de sinal_tempo_expiracao_min.
  // TODO: disparar confirmação via WhatsApp Cloud API com o link do .ics.

  return NextResponse.json({ id: agendamento.id, status: agendamento.status });
}
