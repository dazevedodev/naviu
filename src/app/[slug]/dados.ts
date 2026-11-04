import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Barbearia, Barbeiro, Servico } from "@/lib/types";

// `cache`: a página e os metadados (título da aba) pedem a mesma barbearia;
// assim o banco é consultado uma vez só por visita.
export const buscarDadosBarbearia = cache(async (slug: string) => {
  const supabase = await createClient();

  const { data: barbearia } = await supabase
    .from("barbearias")
    .select("*")
    .eq("slug", slug)
    .single<Barbearia>();

  if (!barbearia) return null;

  const [{ data: barbeiros }, { data: servicos }] = await Promise.all([
    supabase
      .from("barbeiros")
      .select("*")
      .eq("barbearia_id", barbearia.id)
      .eq("ativo", true)
      .order("nome")
      .returns<Barbeiro[]>(),
    supabase
      .from("servicos")
      .select("*")
      .eq("barbearia_id", barbearia.id)
      .eq("ativo", true)
      .order("nome")
      .returns<Servico[]>(),
  ]);

  return { barbearia, barbeiros: barbeiros ?? [], servicos: servicos ?? [] };
});
