"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type DiaHorario = {
  dia_semana: number;
  aberto: boolean;
  hora_inicio: string;
  hora_fim: string;
};

// Substitui a semana inteira de uma vez — mais simples e menos propenso a
// erro do que ficar somando/removendo horário por horário. Cada dia tem no
// máximo um intervalo (nenhum barbeiro real usava mais de um por dia, e
// isso simplificava bastante a tela).
export async function salvarHorariosSemana(barbeiroId: string, dias: DiaHorario[]) {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const { data: barbeiro } = await supabase
    .from("barbeiros")
    .select("id")
    .eq("id", barbeiroId)
    .eq("barbearia_id", barbearia.id)
    .maybeSingle();

  if (!barbeiro) return { error: "Barbeiro não encontrado." };

  for (const d of dias) {
    if (d.aberto && (!d.hora_inicio || !d.hora_fim || d.hora_fim <= d.hora_inicio)) {
      return { error: `Horário inválido em ${DIAS[d.dia_semana]}.` };
    }
  }

  const { error: erroDelete } = await supabase
    .from("horarios_trabalho")
    .delete()
    .eq("barbeiro_id", barbeiroId);

  if (erroDelete) return { error: "Não foi possível salvar. Tente novamente." };

  const linhas = dias
    .filter((d) => d.aberto)
    .map((d) => ({
      barbeiro_id: barbeiroId,
      dia_semana: d.dia_semana,
      hora_inicio: d.hora_inicio,
      hora_fim: d.hora_fim,
    }));

  if (linhas.length > 0) {
    const { error } = await supabase.from("horarios_trabalho").insert(linhas);
    if (error) return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath(`/admin/barbeiros/${barbeiroId}/horarios`);
  return { error: null };
}

const MAX_DIAS_FOLGA = 60;

// Aceita um período (data_inicio até data_fim) pra cobrir o caso mais comum
// de folga — férias de vários dias — sem precisar cadastrar dia por dia.
// Um bloqueio com horário (não dia inteiro) só faz sentido numa data só.
export async function criarFolga(barbeiroId: string, formData: FormData) {
  const dataInicio = String(formData.get("data_inicio") ?? "");
  const dataFimInformada = String(formData.get("data_fim") ?? "");
  const diaInteiro = formData.get("dia_inteiro") === "on";
  const hora_inicio = diaInteiro ? null : String(formData.get("hora_inicio") ?? "") || null;
  const hora_fim = diaInteiro ? null : String(formData.get("hora_fim") ?? "") || null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  if (!dataInicio) return { error: "Escolha uma data." };

  const dataFim = diaInteiro && dataFimInformada ? dataFimInformada : dataInicio;
  if (dataFim < dataInicio) {
    return { error: "A data final não pode ser antes da inicial." };
  }
  if (!diaInteiro && (!hora_inicio || !hora_fim || hora_fim <= hora_inicio)) {
    return { error: 'Informe um horário de início e fim válidos, ou marque "dia inteiro".' };
  }

  const datas: string[] = [];
  const cursor = new Date(`${dataInicio}T00:00:00Z`);
  const fim = new Date(`${dataFim}T00:00:00Z`);
  while (cursor <= fim) {
    datas.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (datas.length > MAX_DIAS_FOLGA) {
      return { error: `Período muito longo (máx. ${MAX_DIAS_FOLGA} dias).` };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bloqueios")
    .insert(datas.map((data) => ({ barbeiro_id: barbeiroId, data, hora_inicio, hora_fim, motivo })));

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath(`/admin/barbeiros/${barbeiroId}/horarios`);
  return { error: null };
}

export async function removerFolga(ids: string[], barbeiroId: string) {
  const supabase = await createClient();
  await supabase.from("bloqueios").delete().in("id", ids);
  revalidatePath(`/admin/barbeiros/${barbeiroId}/horarios`);
}
