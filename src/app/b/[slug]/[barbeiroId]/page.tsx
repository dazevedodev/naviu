import { notFound } from "next/navigation";
import { buscarDadosBarbearia } from "../dados";
import { BookingFlow } from "../booking-flow";
import { AgendaPausada, CascaBarbearia } from "../casca";
import { acessoLiberado } from "@/lib/assinatura";

export default async function BarbeariaBarbeiroPublicaPage({
  params,
}: {
  params: Promise<{ slug: string; barbeiroId: string }>;
}) {
  const { slug, barbeiroId } = await params;
  const dados = await buscarDadosBarbearia(slug);

  if (!dados) notFound();
  const { barbearia, barbeiros, servicos } = dados;

  const barbeiro = barbeiros.find((b) => b.id === barbeiroId);
  if (!barbeiro) notFound();

  return (
    <CascaBarbearia barbearia={barbearia} compacta>
      {acessoLiberado(barbearia) ? (
        <BookingFlow
          barbearia={barbearia}
          barbeiros={barbeiros}
          servicos={servicos}
          barbeiroPreSelecionado={barbeiro}
        />
      ) : (
        <AgendaPausada />
      )}
    </CascaBarbearia>
  );
}
