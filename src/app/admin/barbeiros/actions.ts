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

const REMUNERACOES = ["comissao", "fixo_comissao", "aluguel"];

// Como o barbeiro é pago: entra na conta do Financeiro.
export async function salvarRemuneracao(id: string, formData: FormData) {
  const remuneracao = String(formData.get("remuneracao"));
  const ler = (campo: string) => {
    const t = String(formData.get(campo) ?? "0").trim();
    return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t || "0");
  };
  const comissao = remuneracao === "aluguel" ? 0 : ler("comissao_percentual");
  const fixo = remuneracao === "comissao" ? 0 : ler("valor_fixo");

  if (!REMUNERACOES.includes(remuneracao)) return { error: "Escolha como ele é pago." };
  if (!Number.isFinite(comissao) || comissao < 0 || comissao > 100) {
    return { error: "A comissão vai de 0% a 100%." };
  }
  if (!Number.isFinite(fixo) || fixo < 0) return { error: "Valor inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbeiros")
    .update({ remuneracao, comissao_percentual: comissao, valor_fixo: Math.round(fixo * 100) / 100 })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível salvar." };
  revalidatePath("/admin/barbeiros");
  revalidatePath("/admin/financeiro");
  return { error: null };
}
