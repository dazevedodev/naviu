-- Registro de interesse em site personalizado (upsell manual, feito sob
-- encomenda) — sem UI de listagem por enquanto, o dono do Naviu confere via
-- SQL Editor ou recebe por e-mail (ver lib/email.ts).
create table if not exists leads_site_personalizado (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid references barbearias(id) on delete cascade,
  mensagem text,
  criado_em timestamptz not null default now()
);

alter table leads_site_personalizado enable row level security;

create policy "leads_site_personalizado: dono cria pedido" on leads_site_personalizado
  for insert
  with check (
    barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid())
  );
