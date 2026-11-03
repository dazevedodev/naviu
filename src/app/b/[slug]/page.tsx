import Link from "next/link";
import { notFound } from "next/navigation";
import { acessoLiberado } from "@/lib/assinatura";
import { buscarDadosBarbearia } from "./dados";
import { AgendaPausada, CascaBarbearia } from "./casca";
import { ChatAgente } from "./chat-agente";

function linkWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  return `https://wa.me/${digitos.startsWith("55") ? digitos : `55${digitos}`}`;
}

export default async function BarbeariaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await buscarDadosBarbearia(slug);

  if (!dados) notFound();
  const { barbearia, barbeiros, servicos } = dados;
  // O chat só aparece com a chave da IA configurada e algo para agendar.
  const agenteLigado =
    Boolean(process.env.ANTHROPIC_API_KEY) && servicos.length > 0 && barbeiros.length > 0;

  const acoes = acessoLiberado(barbearia) ? (
    <div className="flex flex-col gap-3">
      <Link
        href={`/b/${barbearia.slug}/agendar`}
        className="flex h-14 w-full items-center justify-center rounded-full bg-white text-base font-semibold text-navalha transition-colors hover:bg-rosado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Agendar horário
      </Link>
      {agenteLigado && <ChatAgente slug={barbearia.slug} />}
      {barbearia.telefone_whatsapp && (
        <a
          href={linkWhatsApp(barbearia.telefone_whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex justify-center text-sm font-medium text-rosado underline-offset-4 hover:text-white hover:underline"
        >
          Falar no WhatsApp
        </a>
      )}
    </div>
  ) : (
    <AgendaPausada />
  );

  return (
    <CascaBarbearia barbearia={barbearia} topo={acoes}>
      {servicos.length > 0 && (
        <section>
          <h2 className="mb-1 font-display text-sm font-semibold">Serviços</h2>
          <ul className="divide-y divide-black/[0.07]">
            {servicos.map((s) => (
              <li key={s.id} className="flex items-center gap-4 py-4">
                {s.imagem_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.imagem_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.nome}</p>
                  {s.legenda && <p className="mt-0.5 text-sm text-aco">{s.legenda}</p>}
                  {s.mostrar_duracao && (
                    <p className="mt-0.5 text-xs text-aco">{s.duracao_min} min</p>
                  )}
                </div>
                <p className="shrink-0 font-semibold tabular-nums">
                  {s.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </CascaBarbearia>
  );
}
