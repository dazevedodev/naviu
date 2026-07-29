import { createClient } from "@/lib/supabase/server";
import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { DadosBarbeariaForm } from "./dados-barbearia-form";
import { ConfigHorarioForm } from "./config-horario-form";
import { ConfigSinalForm } from "./config-sinal-form";

export default async function ConfiguracoesPage() {
  const barbearia = await getBarbeariaAtual();

  const supabase = await createClient();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("email")
    .eq("barbearia_id", barbearia.id)
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Configurações
      </h1>

      <DadosBarbeariaForm barbearia={barbearia} />

      <ConfigHorarioForm barbearia={barbearia} />

      <ConfigSinalForm barbearia={barbearia} usuarioEmail={usuario?.email ?? null} />
    </div>
  );
}
