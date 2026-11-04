import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import type { Remuneracao } from "@/lib/financeiro";
import { Cabecalho, Iniciais, Vazio } from "../ui";
import { desativarBarbeiro } from "./actions";
import { NovoBarbeiroForm } from "./novo-barbeiro-form";
import { RemuneracaoForm } from "./remuneracao-form";

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
      <Cabecalho
        titulo="Barbeiros"
        descricao={`${barbeiros?.length ?? 0} de ${barbearia.limite_barbeiros} no seu plano`}
      />

      <div className="mb-6">
        <NovoBarbeiroForm />
      </div>

      {!barbeiros?.length && <Vazio>Adicione o primeiro barbeiro para abrir a agenda.</Vazio>}

      <div className="grid gap-4 lg:grid-cols-2">
        {barbeiros?.map((b) => (
          <section key={b.id} className="rounded-3xl bg-white p-5 lg:p-6">
            <div className="mb-5 flex items-center gap-3">
              <Iniciais nome={b.nome} foto={b.foto_url} tamanho="h-12 w-12" />
              <p className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{b.nome}</p>
              <Link
                href={`/admin/barbeiros/${b.id}/horarios`}
                className="rounded-full bg-[#F6F1F1] px-4 py-2 text-sm font-semibold hover:bg-rosado/50"
              >
                Horários e folgas
              </Link>
            </div>

            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-aco">Como é pago</h2>
            <RemuneracaoForm
              id={b.id}
              remuneracao={(b.remuneracao ?? "comissao") as Remuneracao}
              comissao={Number(b.comissao_percentual ?? 50)}
              fixo={Number(b.valor_fixo ?? 0)}
            />

            <form
              className="mt-5 border-t border-black/[0.06] pt-4"
              action={async () => {
                "use server";
                await desativarBarbeiro(b.id);
              }}
            >
              <button className="text-sm font-medium text-aco hover:text-navalha">
                Desativar {b.nome.split(" ")[0]}
              </button>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
