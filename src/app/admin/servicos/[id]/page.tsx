import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { DetalhesServicoForm } from "./detalhes-servico-form";

export default async function DetalheServicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const { data: servico } = await supabase
    .from("servicos")
    .select("*")
    .eq("id", id)
    .eq("barbearia_id", barbearia.id)
    .single();

  if (!servico) notFound();

  return (
    <div>
      <Link href="/admin/servicos" className="text-xs text-white0 hover:underline">
        ← Serviços
      </Link>
      <h1 className="mb-1 mt-2 text-lg font-semibold text-tinta">
        {servico.nome}
      </h1>
      <p className="mb-6 text-sm text-white0">
        {servico.duracao_min} min ·{" "}
        {servico.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>

      <DetalhesServicoForm servico={servico} />
    </div>
  );
}
