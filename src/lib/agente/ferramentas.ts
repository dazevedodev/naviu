import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarAgendamento } from "../agendar";
import { formatarAniversario, lerAniversario } from "../aniversario";
import { STATUS_ATIVOS, cancelarPeloCliente } from "../cancelar";
import { horariosLivres } from "../disponibilidade";
import { normalizarTelefone, telefoneValido } from "../telefone";
import {
  dataISOBrasilia,
  formatarDataBrasilia,
  formatarHoraBrasilia,
  hojeISOBrasilia,
} from "../timezone";
import type { Barbearia, Barbeiro, Servico } from "../types";
import {
  DIAS_SEMANA,
  MAX_DIAS_A_FRENTE,
  dataISOValida,
  intervaloDeDatas,
  noPeriodo,
  somarDias,
  type Periodo,
} from "./datas";

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
  // Para o navegador lembrar quem agendou e a Navi reconhecer da próxima vez.
  cliente: { nome: string; telefone: string; email?: string };
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
        aniversario: {
          type: "string",
          description: "dia e mês do aniversário, dd/mm (opcional, só se o cliente disser)",
        },
      },
      required: ["servico_id", "barbeiro_id", "data_hora", "nome", "telefone_whatsapp"],
      additionalProperties: false,
    },
  },
  {
    name: "buscar_cliente",
    description:
      "Procura o cliente pelo WhatsApp nesta barbearia. Diz se é cliente novo ou antigo e traz o nome, " +
      "quantas vezes já veio, o último serviço e os próximos horários marcados (com agendamento_id). " +
      "Use assim que souber o WhatsApp do cliente, e sempre antes de remarcar ou cancelar.",
    input_schema: {
      type: "object",
      properties: {
        telefone_whatsapp: { type: "string", description: "WhatsApp com DDD" },
      },
      required: ["telefone_whatsapp"],
      additionalProperties: false,
    },
  },
  {
    name: "cancelar_agendamento",
    description:
      "Desmarca um horário futuro do cliente. O agendamento_id vem de buscar_cliente e precisa ser " +
      "do mesmo WhatsApp. Só chame depois que o cliente confirmou qual horário quer desmarcar. " +
      "Para remarcar: primeiro agende o horário novo, e só depois cancele o antigo.",
    input_schema: {
      type: "object",
      properties: {
        agendamento_id: { type: "string" },
        telefone_whatsapp: { type: "string" },
      },
      required: ["agendamento_id", "telefone_whatsapp"],
      additionalProperties: false,
    },
  },
  {
    name: "entrar_na_lista_de_espera",
    description:
      "Coloca o cliente na lista de espera de um dia sem horário livre: se alguém cancelar, ele recebe um e-mail " +
      "para marcar. Só ofereça quando ver_horarios_livres não tiver nada que sirva no dia que ele quer e ele não " +
      "quiser outro dia. Precisa de nome, WhatsApp e e-mail (o aviso vai por e-mail).",
    input_schema: {
      type: "object",
      properties: {
        servico_id: { type: "string" },
        data: { type: "string", description: "dia desejado, YYYY-MM-DD" },
        periodo: { type: "string", enum: ["manha", "tarde", "noite", "qualquer"] },
        barbeiro_id: { type: "string", description: "só se o cliente faz questão de um barbeiro" },
        nome: { type: "string" },
        telefone_whatsapp: { type: "string" },
        email: { type: "string" },
      },
      required: ["servico_id", "data", "nome", "telefone_whatsapp", "email"],
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

  const aniversarioTexto = texto(input.aniversario);
  const aniversario = aniversarioTexto ? lerAniversario(aniversarioTexto) : null;
  if (aniversarioTexto && !aniversario) {
    return { conteudo: "Aniversário inválido: peça dia e mês (dd/mm) ou siga sem.", erro: true };
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
      aniversario,
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
    cliente: { nome, telefone, ...(email ? { email } : {}) },
  };
  return {
    conteudo: JSON.stringify({
      agendado: true,
      id: agendamento.id,
      servico: agendamento.servico,
      barbeiro: agendamento.barbeiro,
      data: agendamento.data,
      hora: agendamento.hora,
      email_de_confirmacao: email ? "enviado" : "sem e-mail",
    }),
    agendamento,
  };
}

async function entrarNaListaDeEspera(
  ctx: ContextoAgente,
  input: Record<string, unknown>,
): Promise<Resultado> {
  const nome = texto(input.nome);
  const telefone = texto(input.telefone_whatsapp);
  const email = texto(input.email);
  const data = texto(input.data);

  if (nome.length < 2) return { conteudo: "Falta o nome do cliente.", erro: true };
  if (!telefoneValido(telefone)) return { conteudo: "WhatsApp inválido. Peça o número com DDD.", erro: true };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { conteudo: "A lista de espera avisa por e-mail: peça um e-mail válido.", erro: true };
  }
  const hoje = hojeISOBrasilia();
  if (!dataISOValida(data) || data < hoje || data > somarDias(hoje, MAX_DIAS_A_FRENTE)) {
    return { conteudo: "Data inválida: precisa ser de hoje até 60 dias para frente, YYYY-MM-DD.", erro: true };
  }

  const servico = ctx.servicos.find((s) => s.id === texto(input.servico_id));
  if (!servico) return { conteudo: "Serviço não encontrado.", erro: true };
  const barbeiroId = texto(input.barbeiro_id);
  const barbeiro = barbeiroId ? ctx.barbeiros.find((b) => b.id === barbeiroId) : undefined;
  if (barbeiroId && !barbeiro) return { conteudo: "Barbeiro não encontrado.", erro: true };
  const periodo = ["manha", "tarde", "noite"].includes(texto(input.periodo)) ? texto(input.periodo) : null;

  // Uma entrada por pessoa e dia: pedir de novo só atualiza o pedido.
  await ctx.supabase
    .from("lista_espera")
    .delete()
    .eq("barbearia_id", ctx.barbearia.id)
    .eq("data", data)
    .eq("telefone_whatsapp", normalizarTelefone(telefone))
    .is("avisado_em", null);

  const { error } = await ctx.supabase.from("lista_espera").insert({
    barbearia_id: ctx.barbearia.id,
    servico_id: servico.id,
    barbeiro_id: barbeiro?.id ?? null,
    data,
    periodo,
    nome,
    telefone_whatsapp: normalizarTelefone(telefone),
    email,
  });
  if (error) return { conteudo: "Não foi possível entrar na lista agora. Tente de novo.", erro: true };

  return {
    conteudo: JSON.stringify({
      na_lista: true,
      servico: servico.nome,
      data,
      periodo: periodo ?? "qualquer",
      barbeiro: barbeiro?.nome ?? "qualquer",
    }),
  };
}

type LinhaHistorico = {
  id: string;
  data_hora: string;
  status: string;
  servicos: { nome: string } | null;
  barbeiros: { nome: string } | null;
};

async function buscarCliente(ctx: ContextoAgente, input: Record<string, unknown>): Promise<Resultado> {
  const telefone = texto(input.telefone_whatsapp);
  if (!telefoneValido(telefone)) return { conteudo: "WhatsApp inválido. Peça o número com DDD.", erro: true };

  const { data: cliente } = await ctx.supabase
    .from("clientes")
    .select("id, nome, aniversario_dia, aniversario_mes")
    .eq("barbearia_id", ctx.barbearia.id)
    .eq("telefone_normalizado", normalizarTelefone(telefone))
    .maybeSingle();

  if (!cliente) {
    return { conteudo: JSON.stringify({ cliente_novo: true, nunca_agendou_aqui: true }) };
  }

  const { data } = await ctx.supabase
    .from("agendamentos")
    .select("id, data_hora, status, servicos(nome), barbeiros(nome)")
    .eq("cliente_id", cliente.id)
    .order("data_hora", { ascending: false })
    .limit(50);
  const historico = (data ?? []) as unknown as LinhaHistorico[];

  const agora = Date.now();
  const proximos = historico
    .filter((a) => STATUS_ATIVOS.includes(a.status) && new Date(a.data_hora).getTime() > agora)
    .reverse()
    .map((a) => {
      const d = new Date(a.data_hora);
      return {
        agendamento_id: a.id,
        servico: a.servicos?.nome ?? "serviço",
        barbeiro: a.barbeiros?.nome ?? "barbeiro",
        data: formatarDataBrasilia(d),
        dia_semana: DIAS_SEMANA[new Date(`${dataISOBrasilia(d)}T00:00:00Z`).getUTCDay()],
        hora: formatarHoraBrasilia(d),
      };
    });
  const passados = historico.filter(
    (a) => a.status !== "cancelado" && new Date(a.data_hora).getTime() <= agora,
  );
  const ultimo = passados.find((a) => a.status !== "faltou");

  return {
    conteudo: JSON.stringify({
      cliente_novo: false,
      nome: cliente.nome,
      vezes_que_veio: passados.filter((a) => a.status !== "faltou").length,
      faltas: passados.filter((a) => a.status === "faltou").length,
      ultimo_servico: ultimo
        ? {
            servico: ultimo.servicos?.nome,
            barbeiro: ultimo.barbeiros?.nome,
            data: formatarDataBrasilia(new Date(ultimo.data_hora)),
          }
        : null,
      aniversario:
        cliente.aniversario_dia && cliente.aniversario_mes
          ? formatarAniversario(cliente.aniversario_dia, cliente.aniversario_mes)
          : "não informado",
      proximos_horarios: proximos,
    }),
  };
}

async function cancelarAgendamento(
  ctx: ContextoAgente,
  input: Record<string, unknown>,
): Promise<Resultado> {
  const telefone = texto(input.telefone_whatsapp);
  if (!telefoneValido(telefone)) return { conteudo: "WhatsApp inválido.", erro: true };

  // Só desmarca horário desta barbearia, deste cliente e que ainda não passou.
  const { data } = await ctx.supabase
    .from("agendamentos")
    .select("id, data_hora, clientes!inner(telefone_normalizado)")
    .eq("id", texto(input.agendamento_id))
    .eq("barbearia_id", ctx.barbearia.id)
    .eq("clientes.telefone_normalizado", normalizarTelefone(telefone))
    .maybeSingle();

  if (!data) {
    return { conteudo: "Esse horário não é deste WhatsApp. Use buscar_cliente de novo.", erro: true };
  }
  if (new Date(data.data_hora).getTime() <= Date.now()) {
    return { conteudo: "Esse horário já passou e não pode ser desmarcado.", erro: true };
  }

  const resultado = await cancelarPeloCliente(ctx.supabase, data.id);
  if (resultado.error) return { conteudo: resultado.error, erro: true };
  return { conteudo: JSON.stringify({ cancelado: true }) };
}

export async function executarFerramenta(
  ctx: ContextoAgente,
  nome: string,
  input: unknown,
): Promise<Resultado> {
  const dados = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  if (nome === "ver_horarios_livres") return verHorariosLivres(ctx, dados);
  if (nome === "agendar") return agendar(ctx, dados);
  if (nome === "buscar_cliente") return buscarCliente(ctx, dados);
  if (nome === "cancelar_agendamento") return cancelarAgendamento(ctx, dados);
  if (nome === "entrar_na_lista_de_espera") return entrarNaListaDeEspera(ctx, dados);
  return { conteudo: `Ferramenta desconhecida: ${nome}`, erro: true };
}
