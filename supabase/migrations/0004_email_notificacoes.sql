-- E-mail do cliente (usado pra confirmação/lembrete automáticos) e um token
-- de cancelamento por agendamento (link público que não exige login).
alter table clientes add column if not exists email text;
alter table agendamentos add column if not exists cancelamento_token uuid not null default gen_random_uuid();

create unique index if not exists idx_agendamentos_cancelamento_token
  on agendamentos(cancelamento_token);
