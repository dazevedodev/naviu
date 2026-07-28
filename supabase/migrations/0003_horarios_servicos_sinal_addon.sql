-- Rodar no SQL Editor do projeto já provisionado.

alter table barbearias
  add column sinal_addon_status text not null default 'inativo',
  add column horario_fechamento_padrao time not null default '18:00',
  add column mostrar_fim_servico_cliente boolean not null default false;

alter table servicos
  add column mostrar_duracao boolean not null default true,
  add column legenda text,
  add column observacao_interna text;
