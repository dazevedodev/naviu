import { createEvent } from "ics";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Link público mandado por WhatsApp (sem sessão) — o UUID do agendamento
  // já funciona como token de acesso, então usa service_role pra ler.
  const supabase = createServiceRoleClient();

  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select("data_hora, barbearias(nome, endereco), servicos(nome, duracao_min)")
    .eq("id", id)
    .single();

  if (!agendamento) {
    return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
  }

  const barbearia = agendamento.barbearias as unknown as {
    nome: string;
    endereco: string | null;
  };
  const servico = agendamento.servicos as unknown as {
    nome: string;
    duracao_min: number;
  };

  const inicio = new Date(agendamento.data_hora);

  // Componentes extraídos em UTC (não local) + startInputType "utc": o
  // resultado não depende do fuso do processo rodando o código (dev local
  // costuma ser America/Sao_Paulo, mas o servidor de produção roda em UTC).
  const { error, value } = createEvent({
    title: `${servico.nome} — ${barbearia.nome}`,
    location: barbearia.endereco ?? undefined,
    start: [
      inicio.getUTCFullYear(),
      inicio.getUTCMonth() + 1,
      inicio.getUTCDate(),
      inicio.getUTCHours(),
      inicio.getUTCMinutes(),
    ],
    startInputType: "utc",
    duration: { minutes: servico.duracao_min },
  });

  if (error || !value) {
    return NextResponse.json({ error: "Não foi possível gerar o arquivo." }, { status: 500 });
  }

  return new NextResponse(value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agendamento.ics"`,
    },
  });
}
