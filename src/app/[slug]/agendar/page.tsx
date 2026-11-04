import { notFound } from "next/navigation";
import { buscarDadosBarbearia } from "../dados";
import { BookingFlow } from "../booking-flow";
import { AgendaPausada, CascaBarbearia } from "../casca";
import { acessoLiberado } from "@/lib/assinatura";

export default async function AgendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ servico?: string }>;
}) {
  const { slug } = await params;
  const { servico } = await searchParams;
  const dados = await buscarDadosBarbearia(slug);

  if (!dados) notFound();
  const { barbearia, barbeiros, servicos } = dados;

  return (
    <CascaBarbearia barbearia={barbearia} compacta>
      {acessoLiberado(barbearia) ? (
        <BookingFlow
          barbearia={barbearia}
          barbeiros={barbeiros}
          servicos={servicos}
          servicoInicial={servicos.find((s) => s.id === servico)}
        />
      ) : (
        <AgendaPausada />
      )}
    </CascaBarbearia>
  );
}
