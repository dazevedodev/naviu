import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { AparenciaForm } from "./aparencia-form";
import { SitePersonalizadoForm } from "./site-personalizado-form";

export default async function AparenciaPage() {
  const barbearia = await getBarbeariaAtual();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        Aparência
      </h1>

      <AparenciaForm barbearia={barbearia} />

      <SitePersonalizadoForm />
    </div>
  );
}
