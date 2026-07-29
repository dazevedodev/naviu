-- Tema visual da barbearia (cor da marca; logo já tinha coluna própria
-- desde o schema inicial) e foto por serviço.
alter table barbearias add column if not exists tema jsonb not null default '{}'::jsonb;
alter table servicos add column if not exists imagem_url text;

-- Bucket público pra logo da barbearia e fotos de serviço. Leitura é
-- pública (o bucket é público, não passa por RLS); escrita só pro dono da
-- barbearia, restringindo pelo primeiro segmento do caminho do arquivo
-- (convenção: "{barbearia_id}/logo.ext" ou "{barbearia_id}/servicos/{id}.ext").
insert into storage.buckets (id, name, public)
values ('midia', 'midia', true)
on conflict (id) do nothing;

create policy "midia_owner_insert" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'midia'
    and (storage.foldername(name))[1] in (
      select barbearia_id::text from usuarios where auth_user_id = auth.uid()
    )
  );

create policy "midia_owner_update" on storage.objects for update
  to authenticated
  using (
    bucket_id = 'midia'
    and (storage.foldername(name))[1] in (
      select barbearia_id::text from usuarios where auth_user_id = auth.uid()
    )
  );

create policy "midia_owner_delete" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'midia'
    and (storage.foldername(name))[1] in (
      select barbearia_id::text from usuarios where auth_user_id = auth.uid()
    )
  );
