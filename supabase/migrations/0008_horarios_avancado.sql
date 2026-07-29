-- Cada dia agora pode ser "automático" (abre/fecha + intervalo entre
-- horários, com pausa opcional tipo almoço) ou "manual" (lista solta de
-- horários de início escolhidos um por um, sem depender de intervalo).
alter table horarios_trabalho alter column hora_inicio drop not null;
alter table horarios_trabalho alter column hora_fim drop not null;

alter table horarios_trabalho add column if not exists modo text not null default 'automatico';
-- intervalo_min: passo entre horários no modo automático (padrão 15min
-- preserva o comportamento de antes pros barbeiros já cadastrados).
alter table horarios_trabalho add column if not exists intervalo_min int not null default 15;
alter table horarios_trabalho add column if not exists pausa_inicio time;
alter table horarios_trabalho add column if not exists pausa_fim time;
-- horarios_manuais: array de strings "HH:MM", só usado no modo manual.
alter table horarios_trabalho add column if not exists horarios_manuais jsonb not null default '[]'::jsonb;
