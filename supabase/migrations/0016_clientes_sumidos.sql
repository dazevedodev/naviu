-- Clientes sumidos: o painel lista quem não volta há um tempo para o dono
-- chamar no WhatsApp. chamado_em guarda quando ele chamou, para a pessoa sair
-- da lista por um tempo e não receber a mesma mensagem duas vezes.
-- Pode rodar de novo sem problema.

alter table clientes add column if not exists chamado_em timestamptz;

-- A coluna nova entra no fim da view: o Postgres só deixa acrescentar
-- colunas no final com "create or replace".
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
  min(a.data_hora) filter (where a.status in ('pendente', 'confirmado') and a.data_hora > now()) as proximo_horario,
  c.chamado_em
from clientes c
left join agendamentos a on a.cliente_id = c.id
group by c.id;
