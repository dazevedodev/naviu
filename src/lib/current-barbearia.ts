import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Barbearia } from "@/lib/types";

// Usada nas páginas /admin/*: o proxy já garante que há um usuário
// autenticado; aqui resolvemos a barbearia dona da sessão.
export async function getBarbeariaAtual(): Promise<Barbearia> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("barbearia_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!usuario) redirect("/login");

  const { data: barbearia } = await supabase
    .from("barbearias")
    .select("*")
    .eq("id", usuario.barbearia_id)
    .single();

  if (!barbearia) redirect("/login");

  return barbearia as Barbearia;
}
