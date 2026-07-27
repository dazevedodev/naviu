"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { gerarSlugUnico } from "@/lib/slug";

const DIAS_TRIAL = 14;

export async function criarConta(formData: FormData) {
  const nomeBarbearia = String(formData.get("nome_barbearia") ?? "").trim();
  const nomeResponsavel = String(formData.get("nome_responsavel") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!nomeBarbearia || !nomeResponsavel || !email) {
    return { error: "Preencha todos os campos." };
  }
  if (senha.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const supabase = createServiceRoleClient();

  const slug = await gerarSlugUnico(nomeBarbearia, async (candidato) => {
    const { data } = await supabase
      .from("barbearias")
      .select("id")
      .eq("slug", candidato)
      .maybeSingle();
    return Boolean(data);
  });

  const { data: authUser, error: erroAuth } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (erroAuth || !authUser.user) {
    if (erroAuth?.code === "email_exists") {
      return { error: "Já existe uma conta com esse e-mail. Faça login." };
    }
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  const assinaturaValidoAte = new Date();
  assinaturaValidoAte.setDate(assinaturaValidoAte.getDate() + DIAS_TRIAL);

  const { data: barbearia, error: erroBarbearia } = await supabase
    .from("barbearias")
    .insert({
      nome: nomeBarbearia,
      slug,
      assinatura_status: "trial",
      assinatura_valido_ate: assinaturaValidoAte.toISOString(),
    })
    .select("id")
    .single();

  if (erroBarbearia || !barbearia) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return { error: "Não foi possível criar a barbearia. Tente novamente." };
  }

  const { error: erroUsuario } = await supabase.from("usuarios").insert({
    barbearia_id: barbearia.id,
    auth_user_id: authUser.user.id,
    nome: nomeResponsavel,
    email,
  });

  if (erroUsuario) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    await supabase.from("barbearias").delete().eq("id", barbearia.id);
    return { error: "Não foi possível vincular seu usuário. Tente novamente." };
  }

  return { error: null };
}
