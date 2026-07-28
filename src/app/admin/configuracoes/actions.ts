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

export async function salvarMensagensWhatsApp(formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const mensagem_confirmacao = String(formData.get("mensagem_confirmacao") ?? "").trim();
  const mensagem_lembrete = String(formData.get("mensagem_lembrete") ?? "").trim();

  if (!mensagem_confirmacao || !mensagem_lembrete) {
    return { error: "As duas mensagens são obrigatórias." };
  }

  const supabase = await createClient();
  await supabase
    .from("barbearias")
    .update({ mensagem_confirmacao, mensagem_lembrete })
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

export async function salvarConfigSinal(formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const sinal_ativo = formData.get("sinal_ativo") === "on";
  const sinal_tipo = String(formData.get("sinal_tipo") ?? "fixo");
  const sinal_valor = Number(formData.get("sinal_valor") ?? 0);
  const sinal_tempo_expiracao_min = Number(
    formData.get("sinal_tempo_expiracao_min") ?? 15,
  );

  // Sinal é um complemento pago — não deixa ligar sem o complemento ativo,
  // mesmo que alguém tente burlar o checkbox desabilitado na interface.
  if (sinal_ativo && barbearia.sinal_addon_status !== "ativo") {
    return {
      error: "Assine o complemento do sinal (R$15/mês) antes de ativar essa opção.",
    };
  }

  const supabase = await createClient();
  await supabase
    .from("barbearias")
    .update({
      sinal_ativo,
      sinal_tipo,
      sinal_valor: Number.isFinite(sinal_valor) ? sinal_valor : 0,
      sinal_tempo_expiracao_min: Number.isFinite(sinal_tempo_expiracao_min)
        ? sinal_tempo_expiracao_min
        : 15,
    })
    .eq("id", barbearia.id);

  revalidatePath("/admin/configuracoes");
  return { error: null };
}
