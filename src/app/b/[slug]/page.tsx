import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarDadosBarbearia } from "./dados";

const COR_PADRAO = "#09090b";

export default async function BarbeariaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await buscarDadosBarbearia(slug);

  if (!dados) notFound();
  const { barbearia, servicos } = dados;
  const corFundo = barbearia.tema?.cor_fundo;

  return (
    <div
      className={`flex flex-1 flex-col items-center px-4 py-10 ${
        corFundo ? "" : "bg-zinc-50 dark:bg-black"
      }`}
      style={{
        ["--cor-marca" as string]: barbearia.tema?.cor_primaria || COR_PADRAO,
        ...(corFundo ? { backgroundColor: corFundo } : {}),
      }}
    >
      <div className="w-full max-w-lg">
        {barbearia.capa_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={barbearia.capa_url}
            alt=""
            className="mb-[-2.5rem] h-32 w-full rounded-2xl object-cover"
          />
        )}
        <header className="mb-8 flex flex-col items-center text-center">
          {barbearia.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={barbearia.logo_url}
              alt={barbearia.nome}
              className="mb-4 h-20 w-20 rounded-2xl object-cover shadow-md"
            />
          ) : (
            <div
              className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-semibold text-white shadow-md"
              style={{ backgroundColor: "var(--cor-marca)" }}
            >
              {barbearia.nome.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            {barbearia.nome}
          </h1>
          {barbearia.endereco && (
            <p className="mt-1 text-sm text-zinc-500">{barbearia.endereco}</p>
          )}
          {barbearia.descricao && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {barbearia.descricao}
            </p>
          )}
        </header>

        <Link
          href={`/b/${barbearia.slug}/agendar`}
          className="mb-3 flex h-12 w-full items-center justify-center rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: "var(--cor-marca)" }}
        >
          Agendar horário
        </Link>

        {barbearia.telefone_whatsapp && (
          <a
            href={`https://wa.me/${
              barbearia.telefone_whatsapp.replace(/\D/g, "").startsWith("55")
                ? barbearia.telefone_whatsapp.replace(/\D/g, "")
                : `55${barbearia.telefone_whatsapp.replace(/\D/g, "")}`
            }`}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8 flex h-11 w-full items-center justify-center rounded-full border border-zinc-300 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Falar no WhatsApp
          </a>
        )}

        {servicos.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Serviços
            </h2>
            <div className="flex flex-col gap-3">
              {servicos.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  {s.imagem_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.imagem_url}
                      alt={s.nome}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                      {s.nome}
                    </p>
                    {s.legenda && (
                      <p className="text-xs text-zinc-500">{s.legenda}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                    {s.mostrar_duracao && `${s.duracao_min} min · `}
                    {s.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
