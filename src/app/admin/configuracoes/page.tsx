import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { DadosBarbeariaForm } from "./dados-barbearia-form";
import { ConfigHorarioForm } from "./config-horario-form";

export default async function ConfiguracoesPage() {
  const barbearia = await getBarbeariaAtual();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Configurações
      </h1>

      <DadosBarbeariaForm barbearia={barbearia} />

      <ConfigHorarioForm barbearia={barbearia} />
    </div>
  );
}
