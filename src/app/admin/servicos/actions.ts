"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { validarImagem, enviarImagem } from "@/lib/upload-imagem";

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

// Apaga de vez (diferente de só marcar inativo). Se o serviço já tem
// agendamento vinculado, o banco recusa a exclusão (FK) — nesse caso avisa
// pra deixar inativo em vez de apagar, já que o histórico depende dele.
export async function apagarServico(id: string) {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();
  const { error } = await supabase
    .from("servicos")
    .delete()
    .eq("id", id)
    .eq("barbearia_id", barbearia.id);

  if (error) {
    if (error.code === "23503") {
      return {
        error: "Esse serviço já tem agendamentos vinculados — deixe inativo em vez de apagar.",
      };
    }
    return { error: "Não foi possível apagar. Tente novamente." };
  }

  revalidatePath("/admin/servicos");
  return { error: null };
}

export async function atualizarDetalhesServico(id: string, formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const legenda = String(formData.get("legenda") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim().slice(0, 40);
  const observacao_interna = String(formData.get("observacao_interna") ?? "").trim();
  const imagem = formData.get("imagem") as File | null;

  const supabase = await createClient();
  const update: Record<string, unknown> = {
    legenda: legenda || null,
    categoria: categoria || null,
    observacao_interna: observacao_interna || null,
  };

  // A foto é opcional nesse form — só troca a imagem se escolheu um
  // arquivo novo dessa vez.
  if (imagem && imagem.size > 0) {
    const erroImagem = validarImagem(imagem);
    if (erroImagem) return { error: erroImagem };

    const ext = imagem.name.split(".").pop() || "jpg";
    const { url, error } = await enviarImagem(
      supabase,
      `${barbearia.id}/servicos/${id}.${ext}`,
      imagem,
    );
    if (error) return { error };
    update.imagem_url = url;
  }

  const { error } = await supabase.from("servicos").update(update).eq("id", id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath(`/admin/servicos/${id}`);
  revalidatePath("/admin/servicos");
  revalidatePath(`/${barbearia.slug}`);
  return { error: null };
}
