import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarAgendamento } from "../agendar";
import { horariosLivres } from "../disponibilidade";
import { telefoneValido } from "../telefone";
import { formatarDataBrasilia, formatarHoraBrasilia, hojeISOBrasilia } from "../timezone";
import type { Barbearia, Barbeiro, Servico } from "../types";
import { DIAS_SEMANA, dataISOValida, intervaloDeDatas, noPeriodo, type Periodo } from "./datas";

// O que o agente sabe da barbearia. Tudo vem do banco, filtrado pelo slug da
// página: o modelo nunca escolhe de qual barbearia está falando.
export type ContextoAgente = {
  supabase: SupabaseClient;
  barbearia: Barbearia;
  barbeiros: Barbeiro[];
  servicos: Servico[];
};

export type AgendamentoFeito = {
  id: string;
  servico: string;
  barbeiro: string;
  data: string; // "06/11/2026"
  hora: string; // "14:00"
};

// Quantos horários o agente recebe por dia; o suficiente para oferecer
// opções sem encher a conversa.
const MAX_HORARIOS_POR_DIA = 12;

export const FERRAMENTAS: Anthropic.Tool[] = [
  {
    name: "ver_horarios_livres",
    description:
      "Lista os horários livres da barbearia para um serviço, num dia ou num intervalo de até 7 dias. " +
      "Use sempre antes de sugerir ou confirmar qualquer horário: só existem os horários que esta ferramenta devolver. " +
      "Cada horário traz o data_hora exato e os barbeiros livres nele.",
    input_schema: {
      type: "object",
      properties: {
        servico_id: { type: "string", description: "id do serviço, da lista de serviços" },
        data_inicio: { type: "string", description: "primeiro dia, YYYY-MM-DD" },
        data_fim: {
          type: "string",
          description: "último dia, YYYY-MM-DD (opcional; sem ele, só data_inicio)",
        },
        barbeiro_id: {
          type: "string",
          description: "id do barbeiro, só se o cliente pediu um barbeiro específico",
        },
        periodo: {
          type: "string",
          enum: ["manha", "tarde", "noite", "qualquer"],
          description: "manhã (antes das 12h), tarde (12h às 18h) ou noite (18h em diante)",
        },
      },
      required: ["servico_id", "data_inicio"],
      additionalProperties: false,
    },
  },
  {
    name: "agendar",
    description:
      "Marca o horário. Só chame depois que o cliente confirmou serviço, barbeiro, dia e hora " +
      "e informou nome e WhatsApp. O data_hora precisa ser um dos devolvidos por ver_horarios_livres.",
    input_schema: {
      type: "object",
      properties: {
        servico_id: { type: "string" },
        barbeiro_id: { type: "string" },
        data_hora: { type: "string", description: "data_hora exato vindo de ver_horarios_livres" },
        nome: { type: "string", description: "nome do cliente" },
        telefone_whatsapp: { type: "string", description: "WhatsApp com DDD" },
        email: {
          type: "string",
          description: "e-mail para receber a confirmação (opcional)",
        },
      },
      required: ["servico_id", "barbeiro_id", "data_hora", "nome", "telefone_whatsapp"],
      additionalProperties: false,
    },
  },
];

type Resultado = { conteudo: string; erro?: boolean; agendamento?: AgendamentoFeito };

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

async function verHorariosLivres(ctx: ContextoAgente, input: Record<string, unknown>): Promise<Resultado> {
  const servico = ctx.servicos.find((s) => s.id === texto(input.servico_id));
  if (!servico) return { conteudo: "Serviço não encontrado. Use um id da lista de serviços.", erro: true };

  const inicio = texto(input.data_inicio);
  const fim = texto(input.data_fim) || inicio;
  if (!dataISOValida(inicio) || !dataISOValida(fim)) {
    return { conteudo: "Datas precisam estar no formato YYYY-MM-DD.", erro: true };
  }

  const barbeiroId = texto(input.barbeiro_id);
  const barbeiros = barbeiroId ? ctx.barbeiros.filter((b) => b.id === barbeiroId) : ctx.barbeiros;
  if (barbeiros.length === 0) return { conteudo: "Barbeiro não encontrado.", erro: true };

  const periodo = (["manha", "tarde", "noite"].includes(texto(input.periodo))
    ? texto(input.periodo)
    : "qualquer") as Periodo;

  const datas = intervaloDeDatas(inicio, fim, hojeISOBrasilia());
  if (datas.length === 0) {
    return { conteudo: "Só dá para consultar de hoje até 60 dias para frente.", erro: true };
  }

  const dias = await Promise.all(
    datas.map(async (dataISO) => {
      const porHorario = new Map<string, { id: string; nome: string }[]>();
      for (const b of barbeiros) {
        const slots = await horariosLivres(ctx.supabase, {
          barbeiroId: b.id,
          duracaoServicoMin: servico.duracao_min,
          dataISO,
        });
        for (const s of slots) {
          if (!noPeriodo(s, periodo)) continue;
          const iso = s.toISOString();
          porHorario.set(iso, [...(porHorario.get(iso) ?? []), { id: b.id, nome: b.nome }]);
        }
      }
      const horarios = [...porHorario.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, MAX_HORARIOS_POR_DIA)
        .map(([iso, livres]) => ({
          hora: formatarHoraBrasilia(new Date(iso)),
          data_hora: iso,
          barbeiros: livres,
        }));
      return {
        data: dataISO,
        dia_semana: DIAS_SEMANA[new Date(`${dataISO}T00:00:00Z`).getUTCDay()],
        horarios,
      };
    }),
  );

  return { conteudo: JSON.stringify({ servico: servico.nome, periodo, dias }) };
}

async function agendar(ctx: ContextoAgente, input: Record<string, unknown>): Promise<Resultado> {
  const nome = texto(input.nome);
  const telefone = texto(input.telefone_whatsapp);
  const email = texto(input.email);

  if (nome.length < 2) return { conteudo: "Falta o nome do cliente.", erro: true };
  if (!telefoneValido(telefone)) {
    return { conteudo: "WhatsApp inválido. Peça o número com DDD.", erro: true };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { conteudo: "E-mail inválido. Peça de novo ou siga sem e-mail.", erro: true };
  }

  const servico = ctx.servicos.find((s) => s.id === texto(input.servico_id));
  const barbeiro = ctx.barbeiros.find((b) => b.id === texto(input.barbeiro_id));
  if (!servico || !barbeiro) return { conteudo: "Serviço ou barbeiro não encontrado.", erro: true };

  const resultado = await criarAgendamento(
    ctx.supabase,
    {
      barbearia_id: ctx.barbearia.id,
      barbeiro_id: barbeiro.id,
      servico_id: servico.id,
      data_hora: texto(input.data_hora),
      nome,
      telefone_whatsapp: telefone,
      email: email || null,
    },
    "agente",
  );

  if (!resultado.ok) {
    return {
      conteudo: `Não foi possível agendar: ${resultado.erro} Consulte os horários livres de novo antes de oferecer outro.`,
      erro: true,
    };
  }

  const dataHora = new Date(texto(input.data_hora));
  const agendamento: AgendamentoFeito = {
    id: resultado.id,
    servico: servico.nome,
    barbeiro: barbeiro.nome,
    data: formatarDataBrasilia(dataHora),
    hora: formatarHoraBrasilia(dataHora),
  };
  return {
    conteudo: JSON.stringify({
      agendado: true,
      ...agendamento,
      email_de_confirmacao: email ? "enviado" : "sem e-mail",
    }),
    agendamento,
  };
}

export async function executarFerramenta(
  ctx: ContextoAgente,
  nome: string,
  input: unknown,
): Promise<Resultado> {
  const dados = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  if (nome === "ver_horarios_livres") return verHorariosLivres(ctx, dados);
  if (nome === "agendar") return agendar(ctx, dados);
  return { conteudo: `Ferramenta desconhecida: ${nome}`, erro: true };
}
