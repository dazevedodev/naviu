import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingFlow } from "./booking-flow";

export default async function BarbeariaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: barbearia } = await supabase
    .from("barbearias")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!barbearia) notFound();

  const [{ data: barbeiros }, { data: servicos }] = await Promise.all([
    supabase
      .from("barbeiros")
      .select("*")
      .eq("barbearia_id", barbearia.id)
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("servicos")
      .select("*")
      .eq("barbearia_id", barbearia.id)
      .eq("ativo", true)
      .order("nome"),
  ]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="w-full max-w-lg">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            {barbearia.nome}
          </h1>
          {barbearia.endereco && (
            <p className="mt-1 text-sm text-zinc-500">{barbearia.endereco}</p>
          )}
        </header>

        <BookingFlow
          barbearia={barbearia}
          barbeiros={barbeiros ?? []}
          servicos={servicos ?? []}
        />
      </div>
    </div>
  );
}
