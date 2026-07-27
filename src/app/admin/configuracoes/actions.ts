"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";

export async function salvarConfigSinal(formData: FormData) {
  const barbearia = await getBarbeariaAtual();
  const sinal_ativo = formData.get("sinal_ativo") === "on";
  const sinal_tipo = String(formData.get("sinal_tipo") ?? "fixo");
  const sinal_valor = Number(formData.get("sinal_valor") ?? 0);
  const sinal_tempo_expiracao_min = Number(
    formData.get("sinal_tempo_expiracao_min") ?? 15,
  );

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
}
