"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type DiaHorario = {
  dia_semana: number;
  aberto: boolean;
  hora_inicio: string;
  hora_fim: string;
};

// Substitui a semana inteira de uma vez — mais simples e menos propenso a
// erro do que ficar somando/removendo horário por horário. Cada dia tem no
// máximo um intervalo (nenhum barbeiro real usava mais de um por dia, e
// isso simplificava bastante a tela).
export async function salvarHorariosSemana(barbeiroId: string, dias: DiaHorario[]) {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const { data: barbeiro } = await supabase
    .from("barbeiros")
    .select("id")
    .eq("id", barbeiroId)
    .eq("barbearia_id", barbearia.id)
    .maybeSingle();

  if (!barbeiro) return { error: "Barbeiro não encontrado." };

  for (const d of dias) {
    if (d.aberto && (!d.hora_inicio || !d.hora_fim || d.hora_fim <= d.hora_inicio)) {
      return { error: `Horário inválido em ${DIAS[d.dia_semana]}.` };
    }
  }

  const { error: erroDelete } = await supabase
    .from("horarios_trabalho")
    .delete()
    .eq("barbeiro_id", barbeiroId);

  if (erroDelete) return { error: "Não foi possível salvar. Tente novamente." };

  const linhas = dias
    .filter((d) => d.aberto)
    .map((d) => ({
      barbeiro_id: barbeiroId,
      dia_semana: d.dia_semana,
      hora_inicio: d.hora_inicio,
      hora_fim: d.hora_fim,
    }));

  if (linhas.length > 0) {
    const { error } = await supabase.from("horarios_trabalho").insert(linhas);
    if (error) return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath(`/admin/barbeiros/${barbeiroId}/horarios`);
  return { error: null };
}
