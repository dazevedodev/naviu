import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { NovoServicoForm } from "./novo-servico-form";
import { ServicoRow } from "./servico-row";

export default async function ServicosPage() {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

  const { data: servicos } = await supabase
    .from("servicos")
    .select("*")
    .eq("barbearia_id", barbearia.id)
    .order("nome", { ascending: true });

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Serviços
      </h1>

      <NovoServicoForm />

      <div className="mt-6 flex flex-col gap-2">
        {servicos?.map((s) => (
          <ServicoRow
            key={s.id}
            id={s.id}
            nome={s.nome}
            duracaoMin={s.duracao_min}
            preco={s.preco}
            ativo={s.ativo}
          />
        ))}
      </div>
    </div>
  );
}
