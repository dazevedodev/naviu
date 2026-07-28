"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";

export async function adicionarHorario(barbeiroId: string, formData: FormData) {
  const dia_semana = Number(formData.get("dia_semana"));
  const hora_inicio = String(formData.get("hora_inicio") ?? "");
  const hora_fim_informado = String(formData.get("hora_fim") ?? "");

  if (!hora_inicio) return { error: "Informe o horário de início." };

  const barbearia = await getBarbeariaAtual();
  const hora_fim = hora_fim_informado || barbearia.horario_fechamento_padrao.slice(0, 5);

  if (hora_fim <= hora_inicio) {
    return { error: "Horário de fim precisa ser depois do início." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("horarios_trabalho")
    .insert({ barbeiro_id: barbeiroId, dia_semana, hora_inicio, hora_fim });

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath(`/admin/barbeiros/${barbeiroId}/horarios`);
  return { error: null };
}

export async function removerHorario(id: string, barbeiroId: string) {
  const supabase = await createClient();
  await supabase.from("horarios_trabalho").delete().eq("id", id);
  revalidatePath(`/admin/barbeiros/${barbeiroId}/horarios`);
}

export async function aplicarPadraoHorario(barbeiroId: string, formData: FormData) {
  const dias = formData.getAll("dias").map(Number);
  const hora_inicio = String(formData.get("hora_inicio") ?? "");
  const hora_fim_informado = String(formData.get("hora_fim") ?? "");

  if (dias.length === 0) return { error: "Escolha pelo menos um dia." };
  if (!hora_inicio) return { error: "Informe o horário de início." };

  const barbearia = await getBarbeariaAtual();
  const hora_fim = hora_fim_informado || barbearia.horario_fechamento_padrao.slice(0, 5);

  if (hora_fim <= hora_inicio) {
    return { error: "Horário de fim precisa ser depois do início." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("horarios_trabalho")
    .insert(dias.map((dia_semana) => ({ barbeiro_id: barbeiroId, dia_semana, hora_inicio, hora_fim })));

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath(`/admin/barbeiros/${barbeiroId}/horarios`);
  return { error: null };
}
