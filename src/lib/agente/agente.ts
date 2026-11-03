import Anthropic from "@anthropic-ai/sdk";
import { formatarHoraBrasilia, hojeISOBrasilia } from "../timezone";
import { DIAS_SEMANA } from "./datas";
import {
  FERRAMENTAS,
  executarFerramenta,
  type AgendamentoFeito,
  type ContextoAgente,
} from "./ferramentas";

// Modelo rápido e barato, que dá conta de agendar. Dá para trocar sem mexer
// no código definindo NAVIU_MODELO_IA (ex.: claude-sonnet-5-5).
const MODELO = process.env.NAVIU_MODELO_IA || "claude-haiku-5-5";

// Rodadas de ferramenta por mensagem do cliente (ver horários, agendar...).
const MAX_RODADAS = 6;

export type RespostaAgente = {
  mensagens: Anthropic.MessageParam[];
  resposta: string;
  agendamento?: AgendamentoFeito;
};

function promptDoSistema(ctx: ContextoAgente): string {
  const { barbearia, barbeiros, servicos } = ctx;
  const preco = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return `Você é a recepção virtual da barbearia ${barbearia.nome}, no site de agendamento Naviu. Seu trabalho é marcar horários conversando com o cliente.

Dados da barbearia:
- Endereço: ${barbearia.endereco || "não informado"}
${barbearia.descricao ? `- Sobre: ${barbearia.descricao}\n` : ""}
Serviços (id | nome | duração | preço):
${servicos.map((s) => `- ${s.id} | ${s.nome} | ${s.duracao_min} min | ${preco(s.preco)}`).join("\n")}

Barbeiros (id | nome):
${barbeiros.map((b) => `- ${b.id} | ${b.nome}`).join("\n")}

Como trabalhar:
- Descubra o serviço, o dia e, se o cliente tiver preferência, o período (manhã, tarde, noite) e o barbeiro. Se ele não disser o serviço e houver mais de um, pergunte.
- Consulte ver_horarios_livres antes de sugerir qualquer horário. Nunca invente horário: ofereça só os que a ferramenta devolveu, no máximo 4 opções por vez.
- Se não houver horário no que ele pediu, diga isso e ofereça o mais próximo (consulte os dias seguintes).
- Antes de marcar, peça nome e WhatsApp com DDD. E-mail é opcional, só para receber a confirmação e o link de cancelamento.
- Antes de chamar agendar, repita serviço, barbeiro, dia e hora e espere o cliente confirmar. Só agende depois de um sim claro.
- Para cancelar ou remarcar: o link de cancelamento vai no e-mail de confirmação; fora isso, o cliente fala direto com a barbearia.
- Fale como uma boa recepcionista: português do Brasil, frases curtas, simpático, sem markdown, sem listas longas.
- Só ajude com o que é desta barbearia (horários, serviços, preços, endereço). Para o resto, diga com educação que só cuida dos agendamentos.
- Cada mensagem do cliente chega com a data e a hora de agora (horário de Brasília). Datas relativas ("sexta", "amanhã", "semana que vem") contam a partir dessa data; "sexta" é a próxima sexta, ou hoje se hoje for sexta.`;
}

// A hora vai junto com a mensagem do cliente, e não no prompt do sistema: o
// raciocínio (thinking) que volta no histórico é assinado contra o prompt do
// sistema, então ele não pode mudar de um minuto para o outro.
function comHoraAtual(mensagem: Anthropic.MessageParam): Anthropic.MessageParam {
  if (typeof mensagem.content !== "string") return mensagem;
  const hoje = hojeISOBrasilia();
  const diaSemana = DIAS_SEMANA[new Date(`${hoje}T00:00:00Z`).getUTCDay()];
  return {
    role: "user",
    content: [
      { type: "text", text: `[Agora: ${diaSemana}, ${hoje}, ${formatarHoraBrasilia(new Date())}]` },
      { type: "text", text: mensagem.content },
    ],
  };
}

// Tira o raciocínio das respostas antigas. Usado só se a API recusar a
// assinatura (por exemplo, a barbearia mudou um serviço no meio da conversa):
// a conversa continua, só sem o raciocínio de antes.
function semRaciocinio(historico: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  return historico.map((m) =>
    m.role === "assistant" && Array.isArray(m.content)
      ? { ...m, content: m.content.filter((b) => b.type !== "thinking" && b.type !== "redacted_thinking") }
      : m,
  );
}

function textoDaResposta(conteudo: Anthropic.ContentBlock[]): string {
  return conteudo
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Uma vez por mensagem do cliente: chama o modelo, executa as ferramentas que
// ele pedir e repete até ele responder com texto. O histórico completo (com
// as chamadas de ferramenta) volta para o navegador e chega de novo na
// próxima mensagem — o servidor não guarda estado.
export async function responderCliente(
  ctx: ContextoAgente,
  historico: Anthropic.MessageParam[],
): Promise<RespostaAgente> {
  const client = new Anthropic();
  let mensagens = [...historico.slice(0, -1), comHoraAtual(historico[historico.length - 1])];
  const system = promptDoSistema(ctx);
  let agendamento: AgendamentoFeito | undefined;

  const chamarModelo = () =>
    client.messages.create({
      model: MODELO,
      max_tokens: 4000,
      system,
      tools: FERRAMENTAS,
      output_config: { effort: "low" },
      messages: mensagens,
    });

  for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
    let resposta: Anthropic.Message;
    try {
      resposta = await chamarModelo();
    } catch (e) {
      if (!(e instanceof Anthropic.BadRequestError) || !/signature/i.test(e.message)) throw e;
      mensagens = semRaciocinio(mensagens);
      resposta = await chamarModelo();
    }

    if (resposta.stop_reason === "refusal") {
      // Não entra no histórico: a conversa continua como se essa resposta
      // não tivesse existido.
      return {
        mensagens: historico,
        resposta: "Desculpe, não consigo ajudar com isso. Quer marcar um horário?",
      };
    }

    mensagens.push({ role: "assistant", content: resposta.content });

    const chamadas = resposta.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (resposta.stop_reason !== "tool_use" || chamadas.length === 0) {
      return {
        mensagens,
        resposta: textoDaResposta(resposta.content) || "Pode repetir, por favor?",
        agendamento,
      };
    }

    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const chamada of chamadas) {
      const r = await executarFerramenta(ctx, chamada.name, chamada.input);
      if (r.agendamento) agendamento = r.agendamento;
      resultados.push({
        type: "tool_result",
        tool_use_id: chamada.id,
        content: r.conteudo,
        ...(r.erro ? { is_error: true } : {}),
      });
    }
    mensagens.push({ role: "user", content: resultados });
  }

  return {
    mensagens,
    resposta: "Me perdi aqui. Pode me dizer de novo o serviço e o dia que você quer?",
    agendamento,
  };
}
