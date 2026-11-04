"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { hojeISOBrasilia } from "@/lib/timezone";

const TIPOS = ["despesa", "vale", "pagamento"] as const;
type Tipo = (typeof TIPOS)[number];

function lerValor(texto: string): number {
  // Aceita "1.250,50", "1250,5" e "1250.50".
  const limpo = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  return Math.round(Number(limpo) * 100) / 100;
}

async function inserir(l: {
  tipo: Tipo;
  descricao: string;
  valor: number;
  data: string;
  barbeiro_id: string | null;
}) {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  if (l.barbeiro_id) {
    const { data: barbeiro } = await supabase
      .from("barbeiros")
      .select("id")
      .eq("id", l.barbeiro_id)
      .eq("barbearia_id", barbearia.id)
      .maybeSingle();
    if (!barbeiro) return { error: "Barbeiro não encontrado." };
  }

  const { error } = await supabase.from("lancamentos").insert({ ...l, barbearia_id: barbearia.id });
  if (error) return { error: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/admin/financeiro");
  return { error: null };
}

export async function adicionarLancamento(formData: FormData) {
  const tipo = String(formData.get("tipo")) as Tipo;
  const descricao = String(formData.get("descricao") ?? "").trim().slice(0, 120);
  const valor = lerValor(String(formData.get("valor") ?? ""));
  const data = String(formData.get("data") ?? "") || hojeISOBrasilia();
  const barbeiroId = String(formData.get("barbeiro_id") ?? "") || null;

  if (!TIPOS.includes(tipo)) return { error: "Tipo inválido." };
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Escreva um valor maior que zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data inválida." };
  if (tipo !== "despesa" && !barbeiroId) return { error: "Escolha o barbeiro." };
  if (tipo === "despesa" && !descricao) return { error: "Escreva o que foi a despesa." };

  return inserir({
    tipo,
    descricao: descricao || (tipo === "vale" ? "Vale" : "Pagamento"),
    valor,
    data,
    barbeiro_id: tipo === "despesa" ? null : barbeiroId,
  });
}

// Fechamento: registra que o dono pagou o que faltava a um barbeiro naquele
// mês. Pagamento de um mês que já passou fica com o último dia dele, para
// abater a conta do mês certo.
export async function pagarBarbeiro(barbeiroId: string, valor: number, mes: string, mesRotulo: string) {
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Não há nada a pagar." };
  if (!/^\d{4}-\d{2}$/.test(mes)) return { error: "Mês inválido." };
  const hoje = hojeISOBrasilia();
  const [ano, m] = mes.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, m, 0)).toISOString().slice(0, 10);
  return inserir({
    tipo: "pagamento",
    descricao: `Fechamento de ${mesRotulo}`,
    valor: Math.round(valor * 100) / 100,
    data: hoje.startsWith(mes) || hoje < `${mes}-01` ? hoje : ultimoDia,
    barbeiro_id: barbeiroId,
  });
}

export async function removerLancamento(id: string) {
  const supabase = await createClient();
  await supabase.from("lancamentos").delete().eq("id", id);
  revalidatePath("/admin/financeiro");
  return { error: null };
}
