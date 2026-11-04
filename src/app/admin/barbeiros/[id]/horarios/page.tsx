import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { HorariosSemanaForm } from "./horarios-semana-form";
import { FolgasForm } from "./folgas-form";
import { removerFolga } from "./actions";
import type { DiaHorario } from "./actions";

type BloqueioRow = {
  id: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  motivo: string | null;
};

type GrupoFolga = {
  ids: string[];
  dataInicio: string;
  dataFim: string;
  horaInicio: string | null;
  horaFim: string | null;
  motivo: string | null;
};

// Junta dias consecutivos com o mesmo motivo/horário num só bloco — uma
// semana de férias vira 1 linha em vez de 7.
function agruparFolgas(bloqueios: BloqueioRow[]): GrupoFolga[] {
  const grupos: GrupoFolga[] = [];

  for (const b of bloqueios) {
    const ultimo = grupos[grupos.length - 1];
    const ehDiaSeguinte =
      ultimo &&
      new Date(`${ultimo.dataFim}T00:00:00Z`).getTime() + 86_400_000 ===
        new Date(`${b.data}T00:00:00Z`).getTime();
    const mesmoTipo =
      ultimo &&
      ultimo.horaInicio === b.hora_inicio &&
      ultimo.horaFim === b.hora_fim &&
      ultimo.motivo === b.motivo;

    if (ultimo && ehDiaSeguinte && mesmoTipo) {
      ultimo.dataFim = b.data;
      ultimo.ids.push(b.id);
    } else {
      grupos.push({
        ids: [b.id],
        dataInicio: b.data,
        dataFim: b.data,
        horaInicio: b.hora_inicio,
        horaFim: b.hora_fim,
        motivo: b.motivo,
      });
    }
  }

  return grupos;
}

function formatarData(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

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

  const hoje = new Date().toISOString().slice(0, 10);
  const [{ data: horarios }, { data: bloqueios }] = await Promise.all([
    supabase
      .from("horarios_trabalho")
      .select(
        "dia_semana, modo, hora_inicio, hora_fim, intervalo_min, pausa_inicio, pausa_fim, horarios_manuais",
      )
      .eq("barbeiro_id", id)
      .order("dia_semana"),
    supabase
      .from("bloqueios")
      .select("id, data, hora_inicio, hora_fim, motivo")
      .eq("barbeiro_id", id)
      .gte("data", hoje)
      .order("data")
      .order("hora_inicio")
      .returns<BloqueioRow[]>(),
  ]);

  const horariosIniciais: DiaHorario[] = Array.from({ length: 7 }, (_, diaSemana) => {
    const doDia = horarios?.find((h) => h.dia_semana === diaSemana);
    return {
      dia_semana: diaSemana,
      aberto: Boolean(doDia),
      modo: (doDia?.modo as "automatico" | "manual") ?? "automatico",
      hora_inicio: doDia?.hora_inicio?.slice(0, 5) ?? "",
      hora_fim: doDia?.hora_fim?.slice(0, 5) ?? "",
      intervalo_min: doDia?.intervalo_min ?? 60,
      pausa_inicio: doDia?.pausa_inicio?.slice(0, 5) ?? "",
      pausa_fim: doDia?.pausa_fim?.slice(0, 5) ?? "",
      horarios_manuais: (doDia?.horarios_manuais as string[] | null) ?? [],
    };
  });

  const grupos = agruparFolgas(bloqueios ?? []);

  return (
    <div>
      <Link href="/admin/barbeiros" className="text-xs text-white0 hover:underline">
        ← Barbeiros
      </Link>
      <h1 className="mb-6 mt-2 text-lg font-semibold text-tinta">
        Disponibilidade de {barbeiro.nome}
      </h1>

      <div className="flex flex-col gap-6">
        <HorariosSemanaForm
          barbeiroId={id}
          horariosIniciais={horariosIniciais}
          horarioFechamentoPadrao={barbearia.horario_fechamento_padrao}
        />

        <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
          <p className="mb-1 text-sm font-semibold text-tinta">
            Folgas e bloqueios
          </p>
          <p className="mb-4 text-xs text-white0">
            Exceções ao horário fixo acima — férias, feriado, saída
            antecipada num dia específico. Pra vários dias seguidos (ex.:
            uma semana de férias), preenche &ldquo;de&rdquo; e &ldquo;até&rdquo; que ele marca
            tudo de uma vez.
          </p>

          <FolgasForm barbeiroId={id} />

          <div className="mt-4 flex flex-col gap-2">
            {grupos.length === 0 && (
              <p className="text-sm text-aco/70">Nenhuma folga marcada.</p>
            )}
            {grupos.map((g) => (
              <div
                key={g.ids[0]}
                className="flex items-center justify-between rounded-xl border border-black/[0.07] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-tinta">
                    {g.dataInicio === g.dataFim
                      ? formatarData(g.dataInicio)
                      : `${formatarData(g.dataInicio)} – ${formatarData(g.dataFim)}`}{" "}
                    —{" "}
                    {g.horaInicio && g.horaFim
                      ? `${g.horaInicio.slice(0, 5)} – ${g.horaFim.slice(0, 5)}`
                      : "dia inteiro"}
                  </p>
                  {g.motivo && <p className="text-xs text-white0">{g.motivo}</p>}
                </div>
                <form
                  action={async () => {
                    "use server";
                    await removerFolga(g.ids, id);
                  }}
                >
                  <button className="text-xs text-navalha hover:underline">
                    remover
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
