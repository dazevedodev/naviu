import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { desativarBarbeiro } from "./actions";
import { NovoBarbeiroForm } from "./novo-barbeiro-form";

export default async function BarbeirosPage() {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const { data: barbeiros } = await supabase
    .from("barbeiros")
    .select("*")
    .eq("barbearia_id", barbearia.id)
    .eq("ativo", true)
    .order("criado_em", { ascending: true });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          Barbeiros
        </h1>
        <p className="text-sm text-zinc-500">
          {barbeiros?.length ?? 0} / {barbearia.limite_barbeiros} (plano{" "}
          {barbearia.plano})
        </p>
      </div>

      <NovoBarbeiroForm />

      <div className="mt-6 flex flex-col gap-2">
        {barbeiros?.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
              {b.nome}
            </p>
            <div className="flex items-center gap-4">
              <Link
                href={`/admin/barbeiros/${b.id}/horarios`}
                className="text-xs text-zinc-500 hover:underline"
              >
                Horários
              </Link>
              <Link
                href={`/admin/barbeiros/${b.id}/bloqueios`}
                className="text-xs text-zinc-500 hover:underline"
              >
                Folgas
              </Link>
              <form
                action={async () => {
                  "use server";
                  await desativarBarbeiro(b.id);
                }}
              >
                <button className="text-xs text-red-600 hover:underline dark:text-red-400">
                  Desativar
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
