-- Rodar no SQL Editor do projeto já provisionado (schema.sql + 0001 já aplicados antes).
alter table barbearias
  add column mensagem_confirmacao text not null default 'Olá {{cliente}}! Seu agendamento na {{barbearia}} foi confirmado para {{data}} às {{hora}}, com {{barbeiro}}. Até lá! 💈',
  add column mensagem_lembrete text not null default 'Olá {{cliente}}! Passando pra lembrar que seu agendamento na {{barbearia}} é daqui a 1 hora, às {{hora}}, com {{barbeiro}}. Te esperamos! 💈';
