import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatarDataBrasilia, formatarHoraBrasilia } from "@/lib/timezone";
import { ConfirmarForm } from "./confirmar-form";

export default async function ConfirmarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select(
      "status, data_hora, presenca_confirmada_em, servicos(nome), barbeiros(nome), barbearias(nome, endereco)",
    )
    .eq("cancelamento_token", token)
    .maybeSingle();

  if (!agendamento) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-sm text-zinc-500">Agendamento não encontrado.</p>
      </div>
    );
  }

  const servico = agendamento.servicos as unknown as { nome: string } | null;
  const barbeiro = agendamento.barbeiros as unknown as { nome: string } | null;
  const barbearia = agendamento.barbearias as unknown as {
    nome: string;
    endereco: string | null;
  } | null;
  const dataHora = new Date(agendamento.data_hora);
  const encerrado =
    ["cancelado", "concluido", "faltou"].includes(agendamento.status) || dataHora <= new Date();

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          {barbearia?.nome}
        </h1>

        <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="font-medium text-zinc-950 dark:text-zinc-50">{servico?.nome}</p>
          <p className="text-zinc-600 dark:text-zinc-400">com {barbeiro?.nome}</p>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {formatarDataBrasilia(dataHora)} às {formatarHoraBrasilia(dataHora)}
          </p>
          {barbearia?.endereco && (
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">{barbearia.endereco}</p>
          )}
        </div>

        {encerrado ? (
          <p className="text-sm text-zinc-500">Esse agendamento não está mais em aberto.</p>
        ) : agendamento.presenca_confirmada_em ? (
          <p className="text-sm text-green-700 dark:text-green-400">
            Presença confirmada. Até lá!
          </p>
        ) : (
          <ConfirmarForm token={token} />
        )}
      </div>
    </div>
  );
}
