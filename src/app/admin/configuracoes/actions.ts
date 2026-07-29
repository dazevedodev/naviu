"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";

export async function salvarDadosBarbearia(formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const nome = String(formData.get("nome") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const telefone_whatsapp = String(formData.get("telefone_whatsapp") ?? "").trim();

  if (!nome) return { error: "Nome é obrigatório." };

  const supabase = await createClient();
  await supabase
    .from("barbearias")
    .update({
      nome,
      endereco: endereco || null,
      telefone_whatsapp: telefone_whatsapp || null,
    })
    .eq("id", barbearia.id);

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
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
