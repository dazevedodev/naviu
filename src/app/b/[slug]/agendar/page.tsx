import { notFound } from "next/navigation";
import { buscarDadosBarbearia } from "../dados";
import { BookingFlow } from "../booking-flow";
import { AgendaPausada } from "../agenda-pausada";
import { acessoLiberado } from "@/lib/assinatura";

const COR_PADRAO = "#09090b";

export default async function AgendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await buscarDadosBarbearia(slug);

  if (!dados) notFound();
  const { barbearia, barbeiros, servicos } = dados;
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
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            {barbearia.nome}
          </h1>
          {barbearia.endereco && (
            <p className="mt-1 text-sm text-zinc-500">{barbearia.endereco}</p>
          )}
        </header>

        {acessoLiberado(barbearia) ? (
          <BookingFlow barbearia={barbearia} barbeiros={barbeiros} servicos={servicos} />
        ) : (
          <AgendaPausada />
        )}
      </div>
    </div>
  );
}
