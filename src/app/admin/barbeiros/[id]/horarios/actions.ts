"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function adicionarHorario(barbeiroId: string, formData: FormData) {
  const dia_semana = Number(formData.get("dia_semana"));
  const hora_inicio = String(formData.get("hora_inicio") ?? "");
  const hora_fim = String(formData.get("hora_fim") ?? "");

  if (!hora_inicio || !hora_fim || hora_fim <= hora_inicio) {
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
