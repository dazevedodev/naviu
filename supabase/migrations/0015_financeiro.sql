-- Etapa B: painel novo com financeiro.
--
-- 1) Como cada barbeiro é pago: comissão (% do que atendeu), salário fixo
--    mais comissão, ou aluguel de cadeira (o barbeiro fica com tudo e paga
--    um valor fixo por mês para a barbearia).
-- 2) Quanto foi cobrado de verdade em cada atendimento concluído (pode ter
--    desconto ou acréscimo em relação ao preço do serviço).
-- 3) Lançamentos do financeiro: despesas da barbearia, vales (adiantamentos)
--    dados a um barbeiro e pagamentos feitos a ele no fechamento.
-- 4) O dono vê e edita os clientes da barbearia direto pelo barbearia_id.
-- 5) Um resumo por cliente: visitas, quanto gastou, faltas, próximo horário.
-- 6) Instagram, TikTok e e-mail de contato na página da barbearia.
--
-- Só acrescenta: seguro de rodar com o site no ar, e de rodar de novo.

-- ---------------------------------------------------------------------------
-- 1) Remuneração do barbeiro
-- ---------------------------------------------------------------------------

alter table barbeiros add column if not exists remuneracao text not null default 'comissao';
alter table barbeiros drop constraint if exists barbeiros_remuneracao_check;
alter table barbeiros add constraint barbeiros_remuneracao_check
  check (remuneracao in ('comissao', 'fixo_comissao', 'aluguel'));

alter table barbeiros add column if not exists comissao_percentual numeric not null default 50;
alter table barbeiros drop constraint if exists barbeiros_comissao_check;
alter table barbeiros add constraint barbeiros_comissao_check
  check (comissao_percentual between 0 and 100);

-- Salário fixo por mês (fixo_comissao) ou aluguel da cadeira por mês (aluguel).
alter table barbeiros add column if not exists valor_fixo numeric not null default 0;
alter table barbeiros drop constraint if exists barbeiros_valor_fixo_check;
alter table barbeiros add constraint barbeiros_valor_fixo_check check (valor_fixo >= 0);

-- ---------------------------------------------------------------------------
-- 2) Valor cobrado no atendimento
-- ---------------------------------------------------------------------------

alter table agendamentos add column if not exists valor_cobrado numeric;
alter table agendamentos add column if not exists concluido_em timestamptz;

-- Atendimentos já concluídos ficam com o preço do serviço.
update agendamentos a
set valor_cobrado = s.preco,
    concluido_em = coalesce(a.concluido_em, a.data_hora)
from servicos s
where s.id = a.servico_id and a.status = 'concluido' and a.valor_cobrado is null;

create index if not exists agendamentos_barbearia_data
  on agendamentos (barbearia_id, data_hora);

-- ---------------------------------------------------------------------------
-- 3) Lançamentos
-- ---------------------------------------------------------------------------

create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references barbearias(id) on delete cascade,
  tipo text not null check (tipo in ('despesa', 'vale', 'pagamento')),
  barbeiro_id uuid references barbeiros(id) on delete set null,
  descricao text not null,
  valor numeric not null check (valor > 0),
  data date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  criado_em timestamptz not null default now(),
  -- Vale e pagamento são sempre de um barbeiro.
  check (tipo = 'despesa' or barbeiro_id is not null)
);

create index if not exists lancamentos_barbearia_data on lancamentos (barbearia_id, data);

alter table lancamentos enable row level security;

drop policy if exists "lancamentos: dono gerencia" on lancamentos;
create policy "lancamentos: dono gerencia" on lancamentos for all
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()))
  with check (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 4) Clientes pelo barbearia_id
-- ---------------------------------------------------------------------------

drop policy if exists "clientes: dono gerencia pelo barbearia_id" on clientes;
create policy "clientes: dono gerencia pelo barbearia_id" on clientes for select
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

drop policy if exists "clientes: dono edita" on clientes;
create policy "clientes: dono edita" on clientes for update
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()))
  with check (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 5) Resumo de cada cliente (tela Clientes do painel)
-- ---------------------------------------------------------------------------

-- security_invoker: a view respeita o RLS de quem consulta, então cada dono
-- só vê os clientes da própria barbearia.
create or replace view clientes_resumo with (security_invoker = true) as
select
  c.id,
  c.barbearia_id,
  c.nome,
  c.telefone_whatsapp,
  c.email,
  c.aniversario_dia,
  c.aniversario_mes,
  c.criado_em,
  count(a.id) filter (where a.status = 'concluido') as visitas,
  coalesce(sum(a.valor_cobrado) filter (where a.status = 'concluido'), 0) as gasto,
  count(a.id) filter (where a.status = 'faltou') as faltas,
  max(a.data_hora) filter (where a.status = 'concluido') as ultima_visita,
  min(a.data_hora) filter (where a.status in ('pendente', 'confirmado') and a.data_hora > now()) as proximo_horario
from clientes c
left join agendamentos a on a.cliente_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- 6) Contatos na página da barbearia (além do WhatsApp)
-- ---------------------------------------------------------------------------

alter table barbearias add column if not exists instagram text;
alter table barbearias add column if not exists tiktok text;
alter table barbearias add column if not exists email_contato text;
