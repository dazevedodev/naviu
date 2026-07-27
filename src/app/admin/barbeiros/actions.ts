"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";

export async function criarBarbeiro(formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Nome é obrigatório." };

  const supabase = await createClient();

  const { count } = await supabase
    .from("barbeiros")
    .select("id", { count: "exact", head: true })
    .eq("barbearia_id", barbearia.id)
    .eq("ativo", true);

  if ((count ?? 0) >= barbearia.limite_barbeiros) {
    return {
      error: `Limite de ${barbearia.limite_barbeiros} barbeiro(s) do plano ${barbearia.plano} atingido.`,
    };
  }

  await supabase.from("barbeiros").insert({ barbearia_id: barbearia.id, nome });
  revalidatePath("/admin/barbeiros");
  return { error: null };
}

export async function desativarBarbeiro(id: string) {
  const supabase = await createClient();
  await supabase.from("barbeiros").update({ ativo: false }).eq("id", id);
  revalidatePath("/admin/barbeiros");
}
