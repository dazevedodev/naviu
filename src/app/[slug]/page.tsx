import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { acessoLiberado } from "@/lib/assinatura";
import { linkInstagram, linkTiktok } from "@/lib/contatos";
import { buscarDadosBarbearia } from "./dados";
import { AgendaPausada, CascaBarbearia } from "./casca";
import { CatalogoServicos } from "./catalogo-servicos";
import { ChatNavi } from "./chat-navi";

function linkWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  return `https://wa.me/${digitos.startsWith("55") ? digitos : `55${digitos}`}`;
}

function linkMapa(endereco: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dados = await buscarDadosBarbearia(slug);
  if (!dados) return {};
  return {
    title: `${dados.barbearia.nome} · Agende seu horário`,
    description: dados.barbearia.endereco ?? `Agende seu horário na ${dados.barbearia.nome}.`,
  };
}

const TITULO_LATERAL = "mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-aco";

export default async function BarbeariaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await buscarDadosBarbearia(slug);

  if (!dados) notFound();
  const { barbearia, barbeiros, servicos } = dados;
  const aberta = acessoLiberado(barbearia);
  // A Navi só aparece com a chave da IA configurada e algo para agendar.
  const naviLigada =
    aberta &&
    Boolean(process.env.ANTHROPIC_API_KEY) &&
    servicos.length > 0 &&
    barbeiros.length > 0;

  const acoes = aberta ? (
    <div className="flex flex-col gap-3 lg:w-64">
      <Link
        href={`/${barbearia.slug}/agendar`}
        className="flex h-14 w-full items-center justify-center rounded-full bg-white text-base font-semibold text-navalha transition-colors hover:bg-rosado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Agendar horário
      </Link>
      {barbearia.telefone_whatsapp && (
        <a
          href={linkWhatsApp(barbearia.telefone_whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-center text-sm font-medium text-rosado underline-offset-4 hover:text-white hover:underline"
        >
          Falar no WhatsApp
        </a>
      )}
    </div>
  ) : (
    <AgendaPausada sobreVermelho />
  );

  return (
    <>
      <CascaBarbearia barbearia={barbearia} topo={acoes}>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16">
          {servicos.length > 0 ? (
            <CatalogoServicos servicos={servicos} slug={barbearia.slug} agendaAberta={aberta} />
          ) : (
            <p className="rounded-2xl bg-[#F6F1F1] p-5 text-center text-sm text-aco">
              Essa barbearia ainda não cadastrou os serviços.
            </p>
          )}

          <aside className="mt-10 flex flex-col gap-9 border-t border-black/[0.07] pt-8 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-1">
            {barbeiros.length > 0 && (
              <div>
                <h2 className={TITULO_LATERAL}>Equipe</h2>
                <ul className="flex flex-col gap-1">
                  {barbeiros.map((b) => {
                    const conteudo = (
                      <>
                        {b.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.foto_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F6F1F1] font-display text-sm font-semibold text-navalha"
                          >
                            {b.nome.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{b.nome}</span>
                          {aberta && (
                            <span className="block text-xs text-aco group-hover:text-navalha">
                              Agendar com {b.nome.split(" ")[0]}
                            </span>
                          )}
                        </span>
                      </>
                    );
                    return (
                      <li key={b.id}>
                        {aberta ? (
                          <Link
                            href={`/${barbearia.slug}/${b.id}`}
                            className="group -mx-2 flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-[#F6F1F1] focus-visible:outline-2 focus-visible:outline-navalha"
                          >
                            {conteudo}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 py-2">{conteudo}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {(barbearia.telefone_whatsapp || barbearia.instagram || barbearia.tiktok || barbearia.email_contato) && (
              <div>
                <h2 className={TITULO_LATERAL}>Contato</h2>
                <ul className="flex flex-col gap-2 text-sm">
                  {[
                    barbearia.telefone_whatsapp && {
                      rotulo: "WhatsApp",
                      texto: barbearia.telefone_whatsapp,
                      href: linkWhatsApp(barbearia.telefone_whatsapp),
                    },
                    barbearia.instagram && {
                      rotulo: "Instagram",
                      texto: `@${barbearia.instagram}`,
                      href: linkInstagram(barbearia.instagram),
                    },
                    barbearia.tiktok && {
                      rotulo: "TikTok",
                      texto: `@${barbearia.tiktok}`,
                      href: linkTiktok(barbearia.tiktok),
                    },
                    barbearia.email_contato && {
                      rotulo: "E-mail",
                      texto: barbearia.email_contato,
                      href: `mailto:${barbearia.email_contato}`,
                    },
                  ]
                    .filter((c): c is { rotulo: string; texto: string; href: string } => Boolean(c))
                    .map((c) => (
                      <li key={c.rotulo}>
                        <a
                          href={c.href}
                          target={c.href.startsWith("mailto:") ? undefined : "_blank"}
                          rel="noopener noreferrer"
                          className="group flex items-baseline justify-between gap-3"
                        >
                          <span className="text-aco">{c.rotulo}</span>
                          <span className="truncate font-semibold group-hover:text-navalha">{c.texto}</span>
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {barbearia.endereco && (
              <div>
                <h2 className={TITULO_LATERAL}>Onde fica</h2>
                <p className="text-sm leading-relaxed">{barbearia.endereco}</p>
                <a
                  href={linkMapa(barbearia.endereco)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-navalha underline-offset-4 hover:underline"
                >
                  Abrir no mapa
                </a>
              </div>
            )}
          </aside>
        </div>
      </CascaBarbearia>

      {naviLigada && <ChatNavi slug={barbearia.slug} barbearia={barbearia.nome} endereco={barbearia.endereco} />}
    </>
  );
}
