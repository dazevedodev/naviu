import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";

function inicioFimDoDia() {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return { inicio: inicio.toISOString(), fim: fim.toISOString() };
}

export default async function AgendaPage() {
  const barbearia = await getBarbeariaAtual();
  const supabase = await createClient();
  const { inicio, fim } = inicioFimDoDia();

  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select("id, data_hora, status, barbeiros(nome), servicos(nome), clientes(nome, telefone_whatsapp)")
    .eq("barbearia_id", barbearia.id)
    .gte("data_hora", inicio)
    .lt("data_hora", fim)
    .order("data_hora", { ascending: true });

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Agenda de hoje
      </h1>

      {!agendamentos?.length && (
        <p className="text-sm text-zinc-500">Nenhum agendamento para hoje.</p>
      )}

      <div className="flex flex-col gap-2">
        {agendamentos?.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                {new Date(a.data_hora).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                — {(a.clientes as unknown as { nome: string })?.nome}
              </p>
              <p className="text-xs text-zinc-500">
                {(a.servicos as unknown as { nome: string })?.nome} com{" "}
                {(a.barbeiros as unknown as { nome: string })?.nome}
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {a.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
