import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { gerarSlotsDisponiveis } from "@/lib/slots";
import { diaSemanaDeData, horarioBrasilia } from "@/lib/timezone";

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

  const inicioDia = horarioBrasilia(dataStr, "00:00");
  if (Number.isNaN(inicioDia.getTime())) {
    return NextResponse.json({ error: "data inválida." }, { status: 400 });
  }
  const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60_000);

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
    .select(
      "dia_semana, modo, hora_inicio, hora_fim, intervalo_min, pausa_inicio, pausa_fim, horarios_manuais",
    )
    .eq("barbeiro_id", barbeiroId);

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
        return {
          inicio: horarioBrasilia(dataStr, b.hora_inicio.slice(0, 5)),
          fim: horarioBrasilia(dataStr, b.hora_fim.slice(0, 5)),
        };
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
    dataISO: dataStr,
    diaSemana: diaSemanaDeData(dataStr),
    duracaoServicoMin: servico.duracao_min,
    horariosTrabalho: horarios ?? [],
    ocupados,
    agora: new Date(),
  });

  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) });
}
