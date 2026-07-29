-- Feature de sinal via PIX removida (nunca chegou a cobrar de verdade,
-- decisão do usuário de tirar completamente em vez de deixar meio pronto).
alter table barbearias drop column if exists sinal_ativo;
alter table barbearias drop column if exists sinal_tipo;
alter table barbearias drop column if exists sinal_valor;
alter table barbearias drop column if exists sinal_tempo_expiracao_min;
alter table barbearias drop column if exists sinal_addon_status;

alter table agendamentos drop column if exists sinal_pago;
alter table agendamentos drop column if exists sinal_valor;

-- Nenhum agendamento real deveria estar em "aguardando_sinal" (a cobrança
-- nunca foi integrada), mas por segurança reclassifica qualquer um que
-- tenha ficado assim como confirmado.
update agendamentos set status = 'confirmado' where status = 'aguardando_sinal';
