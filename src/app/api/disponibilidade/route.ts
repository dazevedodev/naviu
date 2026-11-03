import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { horariosLivres } from "@/lib/disponibilidade";
import { horarioBrasilia } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const barbeiroId = searchParams.get("barbeiro_id");
  const servicoId = searchParams.get("servico_id");
  const dataStr = searchParams.get("data"); // "YYYY-MM-DD"

  if (!barbeiroId || !servicoId || !dataStr) {
    return NextResponse.json(
      { error: "barbeiro_id, servico_id e data são obrigatórios." },
      { status: 400 },
    );
  }

  if (Number.isNaN(horarioBrasilia(dataStr, "00:00").getTime())) {
    return NextResponse.json({ error: "data inválida." }, { status: 400 });
  }

  // Endpoint público: usa service_role porque `agendamentos` só é legível via
  // RLS pelo dono da barbearia, e aqui precisamos ver os horários já ocupados
  // pra qualquer visitante calcular a disponibilidade corretamente.
  const supabase = createServiceRoleClient();

  const { data: servico } = await supabase
    .from("servicos")
    .select("duracao_min")
    .eq("id", servicoId)
    .single();

  if (!servico) {
    return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
  }

  const slots = await horariosLivres(supabase, {
    barbeiroId,
    duracaoServicoMin: servico.duracao_min,
    dataISO: dataStr,
  });

  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) });
}
