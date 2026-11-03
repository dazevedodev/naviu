import { notFound } from "next/navigation";
import { buscarDadosBarbearia } from "../dados";
import { BookingFlow } from "../booking-flow";
import { AgendaPausada, CascaBarbearia } from "../casca";
import { acessoLiberado } from "@/lib/assinatura";

export default async function AgendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await buscarDadosBarbearia(slug);

  if (!dados) notFound();
  const { barbearia, barbeiros, servicos } = dados;

  return (
    <CascaBarbearia barbearia={barbearia} compacta>
      {acessoLiberado(barbearia) ? (
        <BookingFlow barbearia={barbearia} barbeiros={barbeiros} servicos={servicos} />
      ) : (
        <AgendaPausada />
      )}
    </CascaBarbearia>
  );
}
