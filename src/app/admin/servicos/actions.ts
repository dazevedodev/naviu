"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";

export async function criarServico(formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const nome = String(formData.get("nome") ?? "").trim();
  const duracao_min = Number(formData.get("duracao_min"));
  const preco = Number(formData.get("preco"));
  const mostrar_duracao = formData.get("mostrar_duracao") === "on";

  if (!nome) return { error: "Nome é obrigatório." };
  if (!Number.isFinite(duracao_min) || duracao_min <= 0)
    return { error: "Duração inválida." };
  if (!Number.isFinite(preco) || preco < 0) return { error: "Preço inválido." };

  const supabase = await createClient();
  await supabase
    .from("servicos")
    .insert({ barbearia_id: barbearia.id, nome, duracao_min, preco, mostrar_duracao });

  revalidatePath("/admin/servicos");
  return { error: null };
}

export async function alternarAtivoServico(id: string, ativo: boolean) {
  const supabase = await createClient();
  await supabase.from("servicos").update({ ativo }).eq("id", id);
  revalidatePath("/admin/servicos");
}

export async function atualizarDetalhesServico(id: string, formData: FormData) {
  const legenda = String(formData.get("legenda") ?? "").trim();
  const observacao_interna = String(formData.get("observacao_interna") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("servicos")
    .update({
      legenda: legenda || null,
      observacao_interna: observacao_interna || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath(`/admin/servicos/${id}`);
  revalidatePath("/admin/servicos");
  return { error: null };
}
