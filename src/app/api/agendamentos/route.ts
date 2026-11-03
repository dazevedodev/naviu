import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { criarAgendamento } from "@/lib/agendar";

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
  // cliente final nunca tem sessão). Toda a validação de negócio fica em
  // criarAgendamento.
  const supabase = createServiceRoleClient();

  // "manual" pula a checagem da grade de horários, então só vale para o dono
  // logado desta barbearia — o corpo do pedido vem do navegador e não prova nada.
  let manual = false;
  if (origem === "manual") {
    const sessao = await createClient();
    const {
      data: { user },
    } = await sessao.auth.getUser();
    const { data: usuario } = user
      ? await sessao.from("usuarios").select("barbearia_id").eq("auth_user_id", user.id).single()
      : { data: null };
    if (usuario?.barbearia_id !== barbearia_id) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }
    manual = true;
  }

  const resultado = await criarAgendamento(
    supabase,
    { barbearia_id, barbeiro_id, servico_id, data_hora, nome, telefone_whatsapp, email },
    manual ? "manual" : "publico",
  );

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: resultado.status });
  }

  return NextResponse.json({ id: resultado.id, status: resultado.status });
}
