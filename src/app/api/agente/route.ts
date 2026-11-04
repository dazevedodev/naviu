import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { acessoLiberado } from "@/lib/assinatura";
import { responderCliente, type ClienteDoAparelho } from "@/lib/agente/agente";
import { telefoneValido } from "@/lib/telefone";
import type { Barbearia, Barbeiro, Servico } from "@/lib/types";

// Uma mensagem pode levar algumas idas e vindas com o modelo.
export const maxDuration = 60;

const MAX_MENSAGENS = 60;
const MAX_CARACTERES_POR_MENSAGEM = 600;
const MAX_TAMANHO_PEDIDO = 200_000;

// Freio simples contra abuso (cada mensagem custa uma chamada de IA): no
// máximo 20 mensagens a cada 10 minutos por IP. Fica na memória de cada
// instância do servidor, então não é exato, mas corta o grosso.
const LIMITE = 20;
const JANELA_MS = 10 * 60_000;
const pedidosPorIp = new Map<string, number[]>();

function passouDoLimite(ip: string): boolean {
  const agora = Date.now();
  const recentes = (pedidosPorIp.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  recentes.push(agora);
  pedidosPorIp.set(ip, recentes);
  return recentes.length > LIMITE;
}

function erro(mensagem: string, status: number) {
  return NextResponse.json({ error: mensagem }, { status });
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return erro("O atendimento por conversa ainda não está ligado.", 503);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (passouDoLimite(ip)) {
    return erro("Muitas mensagens seguidas. Espere alguns minutos ou use o agendamento normal.", 429);
  }

  const bruto = await request.text();
  if (bruto.length > MAX_TAMANHO_PEDIDO) return erro("Conversa longa demais. Comece de novo.", 413);

  let corpo: { slug?: unknown; mensagens?: unknown; cliente?: unknown };
  try {
    corpo = JSON.parse(bruto);
  } catch {
    return erro("Pedido inválido.", 400);
  }

  const { slug, mensagens } = corpo;
  if (typeof slug !== "string" || !Array.isArray(mensagens) || mensagens.length === 0) {
    return erro("Pedido inválido.", 400);
  }
  if (mensagens.length > MAX_MENSAGENS) return erro("Conversa longa demais. Comece de novo.", 413);

  // A última mensagem é o que o cliente acabou de digitar: tem que ser texto
  // do cliente, curto. O resto do histórico é o que este servidor devolveu
  // antes; se alguém mexer nele, a API da Anthropic recusa ou o agendamento
  // é revalidado do zero em criarAgendamento.
  const ultima = mensagens[mensagens.length - 1] as Anthropic.MessageParam;
  if (
    ultima?.role !== "user" ||
    typeof ultima.content !== "string" ||
    !ultima.content.trim() ||
    ultima.content.length > MAX_CARACTERES_POR_MENSAGEM
  ) {
    return erro("Mensagem inválida.", 400);
  }

  // Quem já agendou neste aparelho (guardado no navegador). Só vale se vier
  // inteiro e com cara de nome e telefone; senão a conversa segue sem pista.
  const c = corpo.cliente as { nome?: unknown; telefone?: unknown } | undefined;
  const cliente: ClienteDoAparelho | undefined =
    c &&
    typeof c.nome === "string" &&
    typeof c.telefone === "string" &&
    c.nome.trim().length >= 2 &&
    c.nome.length <= 80 &&
    telefoneValido(c.telefone)
      ? { nome: c.nome.trim(), telefone: c.telefone.trim() }
      : undefined;

  const supabase = createServiceRoleClient();

  const { data: barbearia } = await supabase
    .from("barbearias")
    .select("*")
    .eq("slug", slug)
    .single<Barbearia>();

  if (!barbearia) return erro("Barbearia não encontrada.", 404);
  if (!acessoLiberado(barbearia)) {
    return erro("O agendamento online desta barbearia está pausado.", 403);
  }

  const [{ data: barbeiros }, { data: servicos }] = await Promise.all([
    supabase
      .from("barbeiros")
      .select("*")
      .eq("barbearia_id", barbearia.id)
      .eq("ativo", true)
      .order("nome")
      .returns<Barbeiro[]>(),
    supabase
      .from("servicos")
      .select("*")
      .eq("barbearia_id", barbearia.id)
      .eq("ativo", true)
      .order("nome")
      .returns<Servico[]>(),
  ]);

  if (!barbeiros?.length || !servicos?.length) {
    return erro("Essa barbearia ainda não tem serviços ou barbeiros cadastrados.", 409);
  }

  try {
    const resultado = await responderCliente(
      { supabase, barbearia, barbeiros, servicos },
      mensagens as Anthropic.MessageParam[],
      cliente,
    );
    return NextResponse.json(resultado);
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) {
      // Histórico corrompido ou adulterado: melhor recomeçar a conversa.
      console.error("agente: pedido recusado pela Anthropic", e.message);
      return erro("Não entendi essa conversa. Vamos começar de novo?", 400);
    }
    if (e instanceof Anthropic.RateLimitError) {
      return erro("Muita gente conversando agora. Tente de novo em instantes.", 503);
    }
    if (e instanceof Anthropic.APIError) {
      console.error("agente: erro da API da Anthropic", e.status, e.message);
      return erro("O atendimento por conversa falhou. Tente de novo ou use o agendamento normal.", 502);
    }
    throw e;
  }
}
