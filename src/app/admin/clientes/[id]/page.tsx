import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { formatarAniversario } from "@/lib/aniversario";
import { reais } from "@/lib/financeiro";
import { formatarDataBrasilia, formatarHoraBrasilia } from "@/lib/timezone";
import { NOME_STATUS } from "@/lib/types";
import { NOME_FORMA } from "../../agenda/detalhe-horario";
import { BOTAO, Cartao, Iniciais, Numero, Vazio, linkWhatsApp } from "../../ui";
import { EditarCliente } from "./editar-cliente";

const COR: Record<string, string> = {
  concluido: "text-emerald-700",
  faltou: "text-amber-700",
  cancelado: "text-aco line-through",
};

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const [{ data: cliente }, { data: historico }] = await Promise.all([
    supabase
      .from("clientes_resumo")
      .select("*")
      .eq("id", id)
      .eq("barbearia_id", barbearia.id)
      .maybeSingle(),
    supabase
      .from("agendamentos")
      .select("id, data_hora, status, valor_cobrado, forma_pagamento, cancelado_por, servicos(nome, preco), barbeiros(nome)")
      .eq("cliente_id", id)
      .eq("barbearia_id", barbearia.id)
      .order("data_hora", { ascending: false })
      .limit(100),
  ]);

  if (!cliente) notFound();

  const visitas = Number(cliente.visitas);
  const gasto = Number(cliente.gasto);
  const primeiroNome = cliente.nome.split(" ")[0];
  const servicos = (historico ?? [])
    .filter((a) => a.status === "concluido")
    .map((a) => (a.servicos as unknown as { nome: string } | null)?.nome)
    .filter(Boolean);
  const favorito = servicos.length
    ? [...new Set(servicos)].sort((a, b) => servicos.filter((s) => s === b).length - servicos.filter((s) => s === a).length)[0]
    : null;

  return (
    <div>
      <Link href="/admin/clientes" className="text-sm font-medium text-aco hover:text-tinta">
        ← Clientes
      </Link>

      <div className="mb-6 mt-3 flex flex-wrap items-center gap-4">
        <Iniciais nome={cliente.nome} tamanho="h-16 w-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">{cliente.nome}</h1>
          <p className="text-sm text-aco">
            {cliente.telefone_whatsapp} · cliente desde {formatarDataBrasilia(new Date(cliente.criado_em))}
          </p>
        </div>
        <a href={linkWhatsApp(cliente.telefone_whatsapp)} target="_blank" rel="noopener noreferrer" className={BOTAO}>
          WhatsApp
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Visitas" valor={String(visitas)} />
        <Numero rotulo="Gastou" valor={reais(gasto)} detalhe={visitas ? `média ${reais(gasto / visitas)}` : undefined} />
        <Numero rotulo="Faltas" valor={String(cliente.faltas)} />
        <Numero
          rotulo="Aniversário"
          valor={cliente.aniversario_dia ? formatarAniversario(cliente.aniversario_dia, cliente.aniversario_mes) : "—"}
          detalhe={favorito ? `costuma fazer ${favorito}` : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Cartao titulo="Histórico">
          {historico?.length ? (
            <ul className="divide-y divide-black/[0.06]">
              {historico.map((a) => {
                const d = new Date(a.data_hora);
                const servico = a.servicos as unknown as { nome: string; preco: number } | null;
                const barbeiro = a.barbeiros as unknown as { nome: string } | null;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {formatarDataBrasilia(d)} <span className="font-normal text-aco">às {formatarHoraBrasilia(d)}</span>
                      </p>
                      <p className="truncate text-sm text-aco">
                        {servico?.nome} com {barbeiro?.nome}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className={`font-semibold ${COR[a.status] ?? ""}`}>
                        {a.status === "cancelado" && a.cancelado_por === "cliente" ? "Desmarcou" : NOME_STATUS[a.status]}
                      </p>
                      {a.status === "concluido" && (
                        <p className="text-aco tabular-nums">
                          {reais(Number(a.valor_cobrado ?? servico?.preco ?? 0))}
                          {a.forma_pagamento && ` · ${NOME_FORMA[a.forma_pagamento]}`}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vazio>Sem horários ainda.</Vazio>
          )}
        </Cartao>

        <div className="flex flex-col gap-6">
          <Cartao titulo="Dados">
            <EditarCliente
              id={cliente.id}
              nome={cliente.nome}
              email={cliente.email ?? ""}
              aniversario={
                cliente.aniversario_dia ? formatarAniversario(cliente.aniversario_dia, cliente.aniversario_mes) : ""
              }
            />
          </Cartao>
          {cliente.aniversario_dia && (
            <a
              href={linkWhatsApp(
                cliente.telefone_whatsapp,
                `Feliz aniversário, ${primeiroNome}! Um abraço de toda a equipe da ${barbearia.nome}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-3xl bg-navalha p-5 text-white hover:bg-navalha-escuro"
            >
              <span className="block font-display font-semibold">Mandar parabéns</span>
              <span className="text-sm text-rosado">Abre o WhatsApp com a mensagem pronta.</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
