"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";

export async function criarServico(formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const nome = String(formData.get("nome") ?? "").trim();
  const duracao_min = Number(formData.get("duracao_min"));
  const preco = Number(formData.get("preco"));

  if (!nome) return { error: "Nome é obrigatório." };
  if (!Number.isFinite(duracao_min) || duracao_min <= 0)
    return { error: "Duração inválida." };
  if (!Number.isFinite(preco) || preco < 0) return { error: "Preço inválido." };

  const supabase = await createClient();
  await supabase
    .from("servicos")
    .insert({ barbearia_id: barbearia.id, nome, duracao_min, preco });

  revalidatePath("/admin/servicos");
  return { error: null };
}

export async function desativarServico(id: string) {
  const supabase = await createClient();
  await supabase.from("servicos").update({ ativo: false }).eq("id", id);
  revalidatePath("/admin/servicos");
}
