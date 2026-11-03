"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { validarImagem, enviarImagem } from "@/lib/upload-imagem";
import { enviarEmailLeadSitePersonalizado } from "@/lib/email";

export async function salvarAparencia(formData: FormData) {
  // O visual da página é o mesmo para todas as barbearias (vermelho Naviu);
  // a barbearia escolhe só a capa e a foto de perfil.
  const barbearia = await getBarbeariaAtual();
  const logo = formData.get("logo") as File | null;
  const capa = formData.get("capa") as File | null;

  const supabase = await createClient();
  let logoUrl = barbearia.logo_url;
  let capaUrl = barbearia.capa_url;

  // Logo e capa são opcionais nesse form — só trocam a imagem se a pessoa
  // escolheu um arquivo novo dessa vez.
  if (logo && logo.size > 0) {
    const erroImagem = validarImagem(logo);
    if (erroImagem) return { error: erroImagem };

    const ext = logo.name.split(".").pop() || "jpg";
    const { url, error } = await enviarImagem(supabase, `${barbearia.id}/logo.${ext}`, logo);
    if (error) return { error };
    logoUrl = url;
  }

  if (capa && capa.size > 0) {
    const erroImagem = validarImagem(capa);
    if (erroImagem) return { error: erroImagem };

    const ext = capa.name.split(".").pop() || "jpg";
    const { url, error } = await enviarImagem(supabase, `${barbearia.id}/capa.${ext}`, capa);
    if (error) return { error };
    capaUrl = url;
  }

  const { error } = await supabase
    .from("barbearias")
    .update({
      logo_url: logoUrl,
      capa_url: capaUrl,
    })
    .eq("id", barbearia.id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/admin/aparencia");
  revalidatePath(`/b/${barbearia.slug}`);
  revalidatePath(`/b/${barbearia.slug}/agendar`);
  return { error: null };
}

export async function solicitarSitePersonalizado(formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const mensagem = String(formData.get("mensagem") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads_site_personalizado")
    .insert({ barbearia_id: barbearia.id, mensagem });

  if (error) return { error: "Não foi possível enviar. Tente novamente." };

  await enviarEmailLeadSitePersonalizado(barbearia.nome, mensagem);

  return { error: null };
}
