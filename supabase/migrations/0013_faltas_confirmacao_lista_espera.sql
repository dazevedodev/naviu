-- Fase 2 do plano: os problemas que a barbearia paga alguém para cuidar.
--
-- 1) Faltas e cancelamentos em cima da hora ficam registrados, para o
--    barbeiro ver o histórico do cliente no painel.
-- 2) Confirmação no dia anterior: o cliente recebe um e-mail e confirma que
--    vai (ou cancela e libera o horário).
-- 3) Lista de espera: quem não achou horário num dia é avisado por e-mail
--    quando alguém cancela.
--
-- Seguro de rodar com o código antigo ainda no ar: só cria colunas e uma
-- tabela nova.

-- ---------------------------------------------------------------------------
-- 1 e 2) Agendamentos
-- ---------------------------------------------------------------------------

-- status ganha o valor 'faltou' (a coluna é texto, não precisa mudar nada).
alter table agendamentos add column if not exists cancelado_em timestamptz;
alter table agendamentos add column if not exists cancelado_por text; -- 'cliente' | 'barbearia'
alter table agendamentos add column if not exists confirmacao_enviada boolean not null default false;
alter table agendamentos add column if not exists presenca_confirmada_em timestamptz;

-- Histórico do cliente no painel: busca pelos agendamentos de um cliente.
create index if not exists agendamentos_cliente on agendamentos (cliente_id);

-- ---------------------------------------------------------------------------
-- 3) Lista de espera
-- ---------------------------------------------------------------------------

create table if not exists lista_espera (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  servico_id uuid not null references servicos(id) on delete cascade,
  barbeiro_id uuid references barbeiros(id) on delete cascade, -- null = qualquer barbeiro
  data date not null,
  periodo text check (periodo in ('manha', 'tarde', 'noite')), -- null = qualquer hora
  nome text not null,
  telefone_whatsapp text not null,
  email text not null,
  avisado_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists lista_espera_pendentes
  on lista_espera (barbearia_id, data) where avisado_em is null;

-- O cliente entra na lista pelo servidor (chave de serviço), nunca direto.
-- O dono da barbearia vê e apaga as entradas dela.
alter table lista_espera enable row level security;

drop policy if exists "lista_espera: dono gerencia" on lista_espera;
create policy "lista_espera: dono gerencia" on lista_espera for all
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()))
  with check (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));
