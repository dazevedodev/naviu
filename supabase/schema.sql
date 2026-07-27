-- Naviu — schema inicial (MVP)
-- Rodar no SQL Editor do Supabase do projeto.

create extension if not exists "pgcrypto";

-- Barbearias
create table barbearias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null, -- usado na URL pública
  endereco text,
  telefone_whatsapp text,
  logo_url text,
  plano text not null default 'solo', -- 'solo' | 'barbearia'
  limite_barbeiros int not null default 1,
  sinal_ativo boolean not null default false,
  sinal_tipo text default 'fixo', -- 'fixo' | 'percentual'
  sinal_valor numeric default 0,
  sinal_tempo_expiracao_min int default 15,
  assinatura_status text not null default 'trial', -- 'trial' | 'ativa' | 'atrasada' | 'cancelada'
  assinatura_valido_ate timestamptz,
  -- Mensagens do WhatsApp, editáveis pela barbearia (não são enviadas via API —
  -- viram um link wa.me que o admin clica e manda manualmente). Variáveis
  -- disponíveis: {{cliente}} {{barbearia}} {{barbeiro}} {{servico}} {{data}} {{hora}}
  mensagem_confirmacao text not null default 'Olá {{cliente}}! Seu agendamento na {{barbearia}} foi confirmado para {{data}} às {{hora}}, com {{barbeiro}}. Até lá! 💈',
  mensagem_lembrete text not null default 'Olá {{cliente}}! Passando pra lembrar que seu agendamento na {{barbearia}} é daqui a 1 hora, às {{hora}}, com {{barbeiro}}. Te esperamos! 💈',
  criado_em timestamptz not null default now()
);

-- Usuários donos/admins da barbearia (login)
create table usuarios (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid references barbearias(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id),
  nome text not null,
  email text unique not null,
  criado_em timestamptz not null default now()
);

-- Barbeiros
create table barbeiros (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid references barbearias(id) on delete cascade,
  nome text not null,
  foto_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Serviços oferecidos
create table servicos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid references barbearias(id) on delete cascade,
  nome text not null,
  duracao_min int not null,
  preco numeric not null,
  ativo boolean not null default true
);

-- Horários de trabalho por barbeiro (regras recorrentes)
create table horarios_trabalho (
  id uuid primary key default gen_random_uuid(),
  barbeiro_id uuid references barbeiros(id) on delete cascade,
  dia_semana int not null, -- 0=domingo ... 6=sábado
  hora_inicio time not null,
  hora_fim time not null
);

-- Bloqueios/folgas pontuais
create table bloqueios (
  id uuid primary key default gen_random_uuid(),
  barbeiro_id uuid references barbeiros(id) on delete cascade,
  data date not null,
  hora_inicio time,
  hora_fim time,
  motivo text
);

-- Clientes (sem necessidade de conta, identificado por telefone)
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone_whatsapp text not null,
  criado_em timestamptz not null default now()
);

-- Agendamentos
create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid references barbearias(id) on delete cascade,
  barbeiro_id uuid references barbeiros(id),
  servico_id uuid references servicos(id),
  cliente_id uuid references clientes(id),
  data_hora timestamptz not null,
  status text not null default 'pendente',
  -- 'pendente' | 'confirmado' | 'cancelado' | 'concluido' | 'aguardando_sinal'
  sinal_pago boolean default false,
  sinal_valor numeric,
  forma_pagamento text, -- 'dinheiro' | 'cartao' | 'pix' | null (definido pelo barbeiro ao concluir o atendimento)
  lembrete_enviado boolean default false,
  criado_em timestamptz not null default now()
);

create index idx_usuarios_barbearia on usuarios(barbearia_id);
create index idx_barbeiros_barbearia on barbeiros(barbearia_id);
create index idx_servicos_barbearia on servicos(barbearia_id);
create index idx_horarios_barbeiro on horarios_trabalho(barbeiro_id);
create index idx_bloqueios_barbeiro_data on bloqueios(barbeiro_id, data);
create index idx_agendamentos_barbearia on agendamentos(barbearia_id);
create index idx_agendamentos_barbeiro_data on agendamentos(barbeiro_id, data_hora);
create index idx_agendamentos_lembrete on agendamentos(data_hora) where lembrete_enviado = false;

-- RLS
alter table barbearias enable row level security;
alter table usuarios enable row level security;
alter table barbeiros enable row level security;
alter table servicos enable row level security;
alter table horarios_trabalho enable row level security;
alter table bloqueios enable row level security;
alter table clientes enable row level security;
alter table agendamentos enable row level security;

-- Leitura pública (necessária para a página pública de agendamento em app/b/[slug]).
-- Escrita fica restrita ao dono autenticado da barbearia (via auth_user_id em `usuarios`).
create policy "barbearias: leitura pública" on barbearias for select using (true);
create policy "barbeiros: leitura pública" on barbeiros for select using (ativo = true);
create policy "servicos: leitura pública" on servicos for select using (ativo = true);
create policy "horarios_trabalho: leitura pública" on horarios_trabalho for select using (true);
create policy "bloqueios: leitura pública" on bloqueios for select using (true);

create policy "usuarios: dono vê seu próprio registro" on usuarios for select
  using (auth_user_id = auth.uid());

create policy "barbearias: dono edita a própria" on barbearias for update
  using (id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

create policy "barbeiros: dono gerencia" on barbeiros for all
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()))
  with check (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

create policy "servicos: dono gerencia" on servicos for all
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()))
  with check (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

create policy "horarios_trabalho: dono gerencia" on horarios_trabalho for all
  using (barbeiro_id in (
    select b.id from barbeiros b join usuarios u on u.barbearia_id = b.barbearia_id
    where u.auth_user_id = auth.uid()
  ))
  with check (barbeiro_id in (
    select b.id from barbeiros b join usuarios u on u.barbearia_id = b.barbearia_id
    where u.auth_user_id = auth.uid()
  ));

create policy "bloqueios: dono gerencia" on bloqueios for all
  using (barbeiro_id in (
    select b.id from barbeiros b join usuarios u on u.barbearia_id = b.barbearia_id
    where u.auth_user_id = auth.uid()
  ))
  with check (barbeiro_id in (
    select b.id from barbeiros b join usuarios u on u.barbearia_id = b.barbearia_id
    where u.auth_user_id = auth.uid()
  ));

-- Clientes e agendamentos: criados pelo cliente final (anon) no fluxo público de agendamento,
-- e visíveis para o dono da barbearia correspondente. Escrita via anon fica restrita a insert
-- (nada de update/delete direto pelo cliente — mudanças de status passam por RPC/API).
create policy "clientes: qualquer um pode criar" on clientes for insert with check (true);
create policy "clientes: dono vê clientes da própria barbearia" on clientes for select
  using (id in (
    select a.cliente_id from agendamentos a
    join usuarios u on u.barbearia_id = a.barbearia_id
    where u.auth_user_id = auth.uid()
  ));

create policy "agendamentos: qualquer um pode criar" on agendamentos for insert with check (true);
create policy "agendamentos: dono vê e gerencia os da própria barbearia" on agendamentos for select
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));
create policy "agendamentos: dono atualiza os da própria barbearia" on agendamentos for update
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()))
  with check (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));
