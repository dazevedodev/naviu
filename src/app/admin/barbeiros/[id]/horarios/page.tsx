import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { HorariosSemanaForm } from "./horarios-semana-form";
import type { DiaHorario } from "./actions";

export default async function HorariosBarbeiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const { data: barbeiro } = await supabase
    .from("barbeiros")
    .select("id, nome")
    .eq("id", id)
    .eq("barbearia_id", barbearia.id)
    .single();

  if (!barbeiro) notFound();

  const { data: horarios } = await supabase
    .from("horarios_trabalho")
    .select("dia_semana, hora_inicio, hora_fim")
    .eq("barbeiro_id", id)
    .order("dia_semana");

  const horariosIniciais: DiaHorario[] = Array.from({ length: 7 }, (_, diaSemana) => {
    // Se por algum motivo existir mais de um horário no mesmo dia (dado
    // antigo), só o primeiro é considerado — a tela só suporta um intervalo
    // por dia agora.
    const doDia = horarios?.find((h) => h.dia_semana === diaSemana);
    return {
      dia_semana: diaSemana,
      aberto: Boolean(doDia),
      hora_inicio: doDia?.hora_inicio.slice(0, 5) ?? "",
      hora_fim: doDia?.hora_fim.slice(0, 5) ?? "",
    };
  });

  return (
    <div>
      <Link href="/admin/barbeiros" className="text-xs text-zinc-500 hover:underline">
        ← Barbeiros
      </Link>
      <h1 className="mb-1 mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Horários de {barbeiro.nome}
      </h1>
      <Link
        href={`/admin/barbeiros/${id}/bloqueios`}
        className="mb-6 inline-block text-xs text-zinc-500 hover:underline"
      >
        Ver folgas →
      </Link>

      <HorariosSemanaForm
        barbeiroId={id}
        horariosIniciais={horariosIniciais}
        horarioFechamentoPadrao={barbearia.horario_fechamento_padrao}
      />
    </div>
  );
}
