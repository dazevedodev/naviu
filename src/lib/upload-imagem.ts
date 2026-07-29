import type { SupabaseClient } from "@supabase/supabase-js";

const TAMANHO_MAX_BYTES = 5 * 1024 * 1024;

export function validarImagem(file: File | null): string | null {
  if (!file || file.size === 0) return "Selecione uma imagem.";
  if (!file.type.startsWith("image/")) return "O arquivo precisa ser uma imagem.";
  if (file.size > TAMANHO_MAX_BYTES) return "Imagem muito grande (máx. 5MB).";
  return null;
}

// Bucket "midia" é público (leitura livre); a RLS de storage.objects só
// deixa escrever num caminho que comece com o próprio barbearia_id — ver
// supabase/migrations/0005_aparencia.sql.
export async function enviarImagem(
  supabase: SupabaseClient,
  path: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const { error } = await supabase.storage
    .from("midia")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return { url: null, error: "Não foi possível enviar a imagem." };

  const { data } = supabase.storage.from("midia").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
