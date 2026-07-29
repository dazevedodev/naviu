"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type ModoHorario = "automatico" | "manual";

export type DiaHorario = {
  dia_semana: number;
  aberto: boolean;
  modo: ModoHorario;
  hora_inicio: string;
  hora_fim: string;
  // null = campo "a cada" deixado em branco — nesse caso o dia vira uma
  // lista de horários soltos (mesmo mecanismo do modo manual), mostrada
  // dentro do próprio card do Automático em vez de trocar de aba.
  intervalo_min: number | null;
  pausa_inicio: string;
  pausa_fim: string;
  horarios_manuais: string[];
};

// Substitui a semana inteira de uma vez — mais simples e menos propenso a
// erro do que ficar somando/removendo horário por horário. Cada dia tem no
// máximo uma configuração (automática ou manual); a pausa cobre o caso de
// precisar de um intervalo no meio do dia sem precisar de várias janelas.
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

  // "Automático" com "a cada" vazio não tem grade nenhuma pra gerar — vira
  // lista de horários soltos por baixo dos panos, igual ao modo manual.
  function modoEfetivo(d: DiaHorario): ModoHorario {
    return d.modo === "automatico" && d.intervalo_min == null ? "manual" : d.modo;
  }

  for (const d of dias) {
    if (!d.aberto) continue;
    if (modoEfetivo(d) === "automatico") {
      if (!d.hora_inicio || !d.hora_fim || d.hora_fim <= d.hora_inicio) {
        return { error: `Horário inválido em ${DIAS[d.dia_semana]}.` };
      }
    } else if (d.horarios_manuais.length === 0) {
      return { error: `Adicione pelo menos um horário em ${DIAS[d.dia_semana]}.` };
    }
  }

  const { error: erroDelete } = await supabase
    .from("horarios_trabalho")
    .delete()
    .eq("barbeiro_id", barbeiroId);

  if (erroDelete) return { error: "Não foi possível salvar. Tente novamente." };

  const linhas = dias
    .filter((d) => d.aberto)
    .map((d) => {
      const modo = modoEfetivo(d);
      // Pausa só é salva se início e fim foram preenchidos — deixar só um
      // dos dois em branco não trava o salvamento, só ignora a pausa.
      const pausaValida = Boolean(
        modo === "automatico" && d.pausa_inicio && d.pausa_fim && d.pausa_fim > d.pausa_inicio,
      );

      return {
        barbeiro_id: barbeiroId,
        dia_semana: d.dia_semana,
        modo,
        hora_inicio: modo === "automatico" ? d.hora_inicio : null,
        hora_fim: modo === "automatico" ? d.hora_fim : null,
        intervalo_min: modo === "automatico" ? d.intervalo_min || 15 : 15,
        pausa_inicio: pausaValida ? d.pausa_inicio : null,
        pausa_fim: pausaValida ? d.pausa_fim : null,
        horarios_manuais: modo === "manual" ? d.horarios_manuais : [],
      };
    });

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
