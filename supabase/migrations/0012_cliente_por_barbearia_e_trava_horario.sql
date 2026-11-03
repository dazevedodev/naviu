-- Fase 1 do plano: base confiável para o agente de IA.
--
-- 1) Cliente reconhecido pelo WhatsApp: um cadastro por pessoa em cada
--    barbearia, em vez de um cadastro novo a cada agendamento.
-- 2) Trava no banco: o próprio Postgres recusa dois agendamentos do mesmo
--    barbeiro que se sobreponham (a checagem na API sozinha não é atômica).
--
-- Seguro de rodar com o código antigo ainda no ar: inserts sem barbearia_id
-- continuam funcionando e o `fim` é preenchido por trigger.

-- ---------------------------------------------------------------------------
-- 1) Clientes por barbearia
-- ---------------------------------------------------------------------------

alter table clientes add column if not exists barbearia_id uuid references barbearias(id) on delete cascade;
alter table clientes add column if not exists telefone_normalizado text;

-- Cadastros antigos herdam a barbearia do primeiro agendamento deles.
update clientes c
set barbearia_id = a.barbearia_id
from (
  select distinct on (cliente_id) cliente_id, barbearia_id
  from agendamentos
  order by cliente_id, criado_em
) a
where a.cliente_id = c.id and c.barbearia_id is null;

-- Só dígitos, sem o 55 do Brasil (mesma regra de src/lib/telefone.ts).
update clientes
set telefone_normalizado = regexp_replace(telefone_whatsapp, '\D', '', 'g')
where telefone_normalizado is null;

update clientes
set telefone_normalizado = substr(telefone_normalizado, 3)
where length(telefone_normalizado) in (12, 13) and telefone_normalizado like '55%';

-- Junta cadastros repetidos: os agendamentos passam para o cadastro mais
-- antigo da mesma pessoa e os outros são apagados.
drop table if exists clientes_duplicados;
create temporary table clientes_duplicados as
select id, manter from (
  select id,
         first_value(id) over (
           partition by barbearia_id, telefone_normalizado
           order by criado_em, id
         ) as manter
  from clientes
  where barbearia_id is not null
) r
where id <> manter;

update agendamentos ag
set cliente_id = d.manter
from clientes_duplicados d
where ag.cliente_id = d.id;

delete from clientes c
using clientes_duplicados d
where c.id = d.id;

drop table clientes_duplicados;

create unique index if not exists clientes_barbearia_telefone_key
  on clientes (barbearia_id, telefone_normalizado);

-- ---------------------------------------------------------------------------
-- 2) Trava contra horário duplicado
-- ---------------------------------------------------------------------------

create extension if not exists btree_gist with schema extensions;

alter table agendamentos add column if not exists fim timestamptz;

-- `fim` = início + duração do serviço. Calculado pelo banco em todo insert
-- ou troca de horário/serviço, então nenhum caminho do código esquece dele.
create or replace function agendamentos_preencher_fim() returns trigger
language plpgsql as $$
begin
  new.fim := new.data_hora + make_interval(mins => coalesce(
    (select duracao_min from servicos where id = new.servico_id), 30
  ));
  return new;
end;
$$;

drop trigger if exists agendamentos_fim on agendamentos;
create trigger agendamentos_fim
  before insert or update of data_hora, servico_id on agendamentos
  for each row execute function agendamentos_preencher_fim();

update agendamentos a
set fim = a.data_hora + make_interval(mins => coalesce(s.duracao_min, 30))
from servicos s
where s.id = a.servico_id and a.fim is null;

update agendamentos set fim = data_hora + interval '30 minutes' where fim is null;

alter table agendamentos alter column fim set not null;

-- Se este comando falhar com "conflicting key value violates exclusion
-- constraint", já existem agendamentos sobrepostos. Para vê-los:
--   select a.id, b.id, a.barbeiro_id, a.data_hora, b.data_hora
--   from agendamentos a join agendamentos b
--     on a.barbeiro_id = b.barbeiro_id and a.id < b.id
--    and a.status <> 'cancelado' and b.status <> 'cancelado'
--    and tstzrange(a.data_hora, a.fim) && tstzrange(b.data_hora, b.fim);
-- Cancele um de cada par e rode de novo a partir daqui.
alter table agendamentos drop constraint if exists agendamentos_sem_sobreposicao;
alter table agendamentos add constraint agendamentos_sem_sobreposicao
  exclude using gist (
    barbeiro_id with =,
    tstzrange(data_hora, fim) with &&
  ) where (status <> 'cancelado');
