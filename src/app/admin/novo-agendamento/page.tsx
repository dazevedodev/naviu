import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { NovoAgendamentoForm } from "./novo-agendamento-form";

export default async function NovoAgendamentoPage() {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();

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
    <div>
      <Link href="/admin" className="text-xs text-zinc-500 hover:underline">
        ← Agenda
      </Link>
      <h1 className="mb-1 mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Novo agendamento
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Pra lançar um atendimento marcado por telefone ou presencial, sem o
        cliente precisar usar o link público.
      </p>

      <NovoAgendamentoForm
        barbeariaId={barbearia.id}
        barbeiros={barbeiros ?? []}
        servicos={servicos ?? []}
      />
    </div>
  );
}
