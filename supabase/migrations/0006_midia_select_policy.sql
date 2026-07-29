-- upload(..., { upsert: true }) precisa checar se já existe um arquivo no
-- mesmo caminho pra decidir entre inserir ou substituir — sem policy de
-- SELECT pro dono, essa checagem falha e o upsert é bloqueado pela RLS
-- mesmo em caminhos que o dono tem todo o direito de escrever. Leitura
-- pública (via URL pública do bucket) não depende disso; é só pro upsert
-- autenticado funcionar.
create policy "midia_owner_select" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'midia'
    and (storage.foldername(name))[1] in (
      select barbearia_id::text from usuarios where auth_user_id = auth.uid()
    )
  );
