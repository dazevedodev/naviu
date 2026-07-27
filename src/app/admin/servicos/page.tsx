import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { desativarServico } from "./actions";
import { NovoServicoForm } from "./novo-servico-form";

export default async function ServicosPage() {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const { data: servicos } = await supabase
    .from("servicos")
    .select("*")
    .eq("barbearia_id", barbearia.id)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Serviços
      </h1>

      <NovoServicoForm />

      <div className="mt-6 flex flex-col gap-2">
        {servicos?.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                {s.nome}
              </p>
              <p className="text-xs text-zinc-500">
                {s.duracao_min} min ·{" "}
                {s.preco.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await desativarServico(s.id);
              }}
            >
              <button className="text-xs text-red-600 hover:underline dark:text-red-400">
                Desativar
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
