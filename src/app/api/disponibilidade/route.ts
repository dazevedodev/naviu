import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { gerarSlotsDisponiveis } from "@/lib/slots";

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

  const data = new Date(`${dataStr}T00:00:00`);
  if (Number.isNaN(data.getTime())) {
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

  const { data: horarios } = await supabase
    .from("horarios_trabalho")
    .select("dia_semana, hora_inicio, hora_fim")
    .eq("barbeiro_id", barbeiroId);

  const inicioDia = new Date(data);
  const fimDia = new Date(data);
  fimDia.setDate(fimDia.getDate() + 1);

  const { data: bloqueios } = await supabase
    .from("bloqueios")
    .select("hora_inicio, hora_fim")
    .eq("barbeiro_id", barbeiroId)
    .eq("data", dataStr);

  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select("data_hora, servicos(duracao_min)")
    .eq("barbeiro_id", barbeiroId)
    .gte("data_hora", inicioDia.toISOString())
    .lt("data_hora", fimDia.toISOString())
    .neq("status", "cancelado");

  const ocupados = [
    ...(bloqueios ?? []).map((b) => {
      if (b.hora_inicio && b.hora_fim) {
        const [hi, mi] = b.hora_inicio.split(":").map(Number);
        const [hf, mf] = b.hora_fim.split(":").map(Number);
        const inicio = new Date(data);
        inicio.setHours(hi, mi, 0, 0);
        const fim = new Date(data);
        fim.setHours(hf, mf, 0, 0);
        return { inicio, fim };
      }
      return { inicio: inicioDia, fim: fimDia }; // dia inteiro
    }),
    ...(agendamentos ?? []).map((a) => {
      const inicio = new Date(a.data_hora);
      const duracao = (a.servicos as unknown as { duracao_min: number } | null)?.duracao_min ?? 30;
      return { inicio, fim: new Date(inicio.getTime() + duracao * 60_000) };
    }),
  ];

  const slots = gerarSlotsDisponiveis({
    data,
    diaSemana: data.getDay(),
    duracaoServicoMin: servico.duracao_min,
    horariosTrabalho: horarios ?? [],
    ocupados,
    agora: new Date(),
  });

  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) });
}
