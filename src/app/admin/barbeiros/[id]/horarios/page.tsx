import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { removerHorario } from "./actions";
import { NovoHorarioForm } from "./novo-horario-form";
import { AplicarPadraoForm } from "./aplicar-padrao-form";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function HorariosBarbeiroPage({
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

  const { data: horarios } = await supabase
    .from("horarios_trabalho")
    .select("*")
    .eq("barbeiro_id", id)
    .order("dia_semana")
    .order("hora_inicio");

  return (
    <div>
      <Link href="/admin/barbeiros" className="text-xs text-zinc-500 hover:underline">
        ← Barbeiros
      </Link>
      <h1 className="mb-1 mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Horários de {barbeiro.nome}
      </h1>
      <Link
        href={`/admin/barbeiros/${id}/bloqueios`}
        className="mb-6 inline-block text-xs text-zinc-500 hover:underline"
      >
        Ver folgas →
      </Link>

      <div className="mb-6">
        <AplicarPadraoForm
          barbeiroId={id}
          horarioFechamentoPadrao={barbearia.horario_fechamento_padrao}
        />
      </div>

      <div className="flex flex-col gap-4">
        {DIAS.map((label, diaSemana) => {
          const doDia = (horarios ?? []).filter((h) => h.dia_semana === diaSemana);
          return (
            <div
              key={diaSemana}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="mb-2 text-sm font-medium text-zinc-950 dark:text-zinc-50">
                {label}
              </p>
              <div className="mb-2 flex flex-col gap-1">
                {doDia.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span>
                      {h.hora_inicio.slice(0, 5)} – {h.hora_fim.slice(0, 5)}
                    </span>
                    <form
                      action={async () => {
                        "use server";
                        await removerHorario(h.id, id);
                      }}
                    >
                      <button className="text-xs text-red-600 hover:underline dark:text-red-400">
                        remover
                      </button>
                    </form>
                  </div>
                ))}
                {doDia.length === 0 && (
                  <p className="text-sm text-zinc-400">Fechado</p>
                )}
              </div>
              <NovoHorarioForm
                barbeiroId={id}
                diaSemana={diaSemana}
                horarioFechamentoPadrao={barbearia.horario_fechamento_padrao}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
