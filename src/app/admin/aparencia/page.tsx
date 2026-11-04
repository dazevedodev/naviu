import { getBarbeariaAtual } from "@/lib/current-barbearia";
import { AparenciaForm } from "./aparencia-form";
import { SitePersonalizadoForm } from "./site-personalizado-form";

export default async function AparenciaPage() {
  const barbearia = await getBarbeariaAtual();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-tinta">
        Aparência
      </h1>

      <AparenciaForm barbearia={barbearia} />

      <SitePersonalizadoForm />
    </div>
  );
}
