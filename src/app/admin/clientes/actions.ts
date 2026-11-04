"use server";

import { revalidatePath } from "next/cache";
import { lerAniversario } from "@/lib/aniversario";
import { createClient } from "@/lib/supabase/server";

export async function salvarCliente(id: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const aniversarioTexto = String(formData.get("aniversario") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (nome.length < 2) return { error: "Escreva o nome do cliente." };
  const aniversario = aniversarioTexto ? lerAniversario(aniversarioTexto) : null;
  if (aniversarioTexto && !aniversario) return { error: "Aniversário inválido. Use dia/mês, ex.: 25/12." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido." };

  // O RLS só deixa o dono editar clientes da própria barbearia.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .update({
      nome,
      email: email || null,
      aniversario_dia: aniversario?.dia ?? null,
      aniversario_mes: aniversario?.mes ?? null,
    })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) return { error: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/admin", "layout");
  return { error: null };
}

// Marca que o dono chamou o cliente no WhatsApp: ele sai da lista de sumidos
// por um tempo.
export async function marcarChamado(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update({ chamado_em: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "Não foi possível marcar. Rode a migração 0016 no Supabase." };
  revalidatePath("/admin", "layout");
  return { error: null };
}
