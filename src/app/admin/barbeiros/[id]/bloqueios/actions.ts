"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function criarBloqueio(barbeiroId: string, formData: FormData) {
  const data = String(formData.get("data") ?? "");
  const diaInteiro = formData.get("dia_inteiro") === "on";
  const hora_inicio = diaInteiro ? null : String(formData.get("hora_inicio") ?? "") || null;
  const hora_fim = diaInteiro ? null : String(formData.get("hora_fim") ?? "") || null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  if (!data) return { error: "Escolha uma data." };
  if (!diaInteiro && (!hora_inicio || !hora_fim || hora_fim <= hora_inicio)) {
    return { error: "Informe um horário de início e fim válidos, ou marque \"dia inteiro\"." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bloqueios")
    .insert({ barbeiro_id: barbeiroId, data, hora_inicio, hora_fim, motivo });

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath(`/admin/barbeiros/${barbeiroId}/bloqueios`);
  return { error: null };
}

export async function removerBloqueio(id: string, barbeiroId: string) {
  const supabase = await createClient();
  await supabase.from("bloqueios").delete().eq("id", id);
  revalidatePath(`/admin/barbeiros/${barbeiroId}/bloqueios`);
}
