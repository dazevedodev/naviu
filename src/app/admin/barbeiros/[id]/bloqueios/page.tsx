import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { removerBloqueio } from "./actions";
import { NovoBloqueioForm } from "./novo-bloqueio-form";

export default async function BloqueiosBarbeiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const { data: barbeiro } = await supabase
    .from("barbeiros")
    .select("id, nome")
    .eq("id", id)
    .eq("barbearia_id", barbearia.id)
    .single();

  if (!barbeiro) notFound();

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: bloqueios } = await supabase
    .from("bloqueios")
    .select("*")
    .eq("barbeiro_id", id)
    .gte("data", hoje)
    .order("data")
    .order("hora_inicio");

  return (
    <div>
      <Link href="/admin/barbeiros" className="text-xs text-zinc-500 hover:underline">
        ← Barbeiros
      </Link>
      <h1 className="mb-1 mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Folgas de {barbeiro.nome}
      </h1>
      <Link
        href={`/admin/barbeiros/${id}/horarios`}
        className="mb-6 inline-block text-xs text-zinc-500 hover:underline"
      >
        Ver horários de trabalho →
      </Link>

      <div className="mb-6">
        <NovoBloqueioForm barbeiroId={id} />
      </div>

      <div className="flex flex-col gap-2">
        {bloqueios?.length === 0 && (
          <p className="text-sm text-zinc-400">Nenhuma folga marcada.</p>
        )}
        {bloqueios?.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                {new Date(`${b.data}T00:00:00`).toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                })}{" "}
                —{" "}
                {b.hora_inicio && b.hora_fim
                  ? `${b.hora_inicio.slice(0, 5)} – ${b.hora_fim.slice(0, 5)}`
                  : "dia inteiro"}
              </p>
              {b.motivo && <p className="text-xs text-zinc-500">{b.motivo}</p>}
            </div>
            <form
              action={async () => {
                "use server";
                await removerBloqueio(b.id, id);
              }}
            >
              <button className="text-xs text-red-600 hover:underline dark:text-red-400">
                remover
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
