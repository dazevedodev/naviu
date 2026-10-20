import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { TelaAssinatura } from "./tela-assinatura";

export const metadata = { title: "Minha assinatura — Naviu" };

export default async function AssinaturaPage() {
  const barbearia = await getBarbeariaAtual();
  return <TelaAssinatura barbearia={barbearia} />;
}
