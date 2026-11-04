"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { problemaNoSlug, slugificar } from "@/lib/slug";
import { lerUsuarioRede } from "@/lib/contatos";

export async function salvarDadosBarbearia(formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const nome = String(formData.get("nome") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const telefone_whatsapp = String(formData.get("telefone_whatsapp") ?? "").trim();

  const slug = slugificar(String(formData.get("slug") ?? "")) || barbearia.slug;
  const instagramTexto = String(formData.get("instagram") ?? "").trim();
  const tiktokTexto = String(formData.get("tiktok") ?? "").trim();
  const email_contato = String(formData.get("email_contato") ?? "").trim();
  const instagram = instagramTexto ? lerUsuarioRede(instagramTexto) : null;
  const tiktok = tiktokTexto ? lerUsuarioRede(tiktokTexto) : null;
  if (instagramTexto && !instagram) return { error: "Instagram inválido. Escreva só o @ da barbearia." };
  if (tiktokTexto && !tiktok) return { error: "TikTok inválido. Escreva só o @ da barbearia." };
  if (email_contato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_contato)) {
    return { error: "E-mail de contato inválido." };
  }

  if (!nome) return { error: "Nome é obrigatório." };
  const erroSlug = slug === barbearia.slug ? null : problemaNoSlug(slug);
  if (erroSlug) return { error: erroSlug };

  const supabase = await createClient();
  const { error } = await supabase
    .from("barbearias")
    .update({
      nome,
      slug,
      endereco: endereco || null,
      telefone_whatsapp: telefone_whatsapp || null,
      instagram,
      tiktok,
      email_contato: email_contato || null,
    })
    .eq("id", barbearia.id);

  // 23505 = já existe outra barbearia com esse link (slug é único no banco).
  if (error?.code === "23505") return { error: "Esse link já está em uso. Escolha outro." };
  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/admin", "layout");
  revalidatePath(`/${barbearia.slug}`);
  revalidatePath(`/${slug}`);
  return { error: null };
}

export async function salvarConfigHorario(formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const horario_fechamento_padrao = String(formData.get("horario_fechamento_padrao") ?? "");
  const mostrar_fim_servico_cliente = formData.get("mostrar_fim_servico_cliente") === "on";

  if (!horario_fechamento_padrao) {
    return { error: "Informe um horário de fechamento padrão." };
  }

  const supabase = await createClient();
  await supabase
    .from("barbearias")
    .update({ horario_fechamento_padrao, mostrar_fim_servico_cliente })
    .eq("id", barbearia.id);

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
  return { error: null };
}
