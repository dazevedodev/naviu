-- Etapa A do sistema novo.
--
-- 1) Serviços com categoria (Cabelo, Barba, Combos...), para a página do
--    cliente agrupar quando a barbearia tem muitos serviços.
-- 2) Aniversário do cliente (só dia e mês: ninguém precisa dar o ano).
--
-- Só acrescenta colunas que aceitam vazio: seguro de rodar com o site no ar.

alter table servicos add column if not exists categoria text;

alter table clientes add column if not exists aniversario_dia smallint
  check (aniversario_dia between 1 and 31);
alter table clientes add column if not exists aniversario_mes smallint
  check (aniversario_mes between 1 and 12);

create index if not exists clientes_aniversario
  on clientes (barbearia_id, aniversario_mes, aniversario_dia)
  where aniversario_mes is not null;
