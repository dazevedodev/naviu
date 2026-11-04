-- Instalação completa do banco do Naviu num projeto Supabase NOVO (vazio).
-- Cole tudo no SQL Editor e clique em Run, uma vez só.
-- Gerado a partir de schema.sql + migrations/0004..0013; as migrações
-- 0001 a 0003 já estão dentro do schema.sql. Num banco que já existe,
-- rode só as migrações novas, não este arquivo.

-- ===== schema.sql =====
-- Naviu — schema inicial (MVP)
-- Rodar no SQL Editor do Supabase do projeto.

create extension if not exists "pgcrypto";

-- Barbearias
create table barbearias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null, -- usado na URL pública
  endereco text,
  telefone_whatsapp text,
  logo_url text,
  plano text not null default 'solo', -- 'solo' | 'barbearia'
  limite_barbeiros int not null default 1,
  sinal_ativo boolean not null default false,
  sinal_tipo text default 'fixo', -- 'fixo' | 'percentual'
  sinal_valor numeric default 0,
  sinal_tempo_expiracao_min int default 15,
  -- Sinal é um complemento pago (R$15/mês) além da assinatura do plano —
  -- sinal_ativo só pode ser true se sinal_addon_status = 'ativo'.
  sinal_addon_status text not null default 'inativo', -- 'inativo' | 'ativo'
  -- Hora de trabalho: por padrão o admin só informa o início de cada dia;
  -- o fim vira esse horário padrão, a menos que ele defina um fim manual
  -- pra aquele dia específico (ver horarios_trabalho.hora_fim_manual).
  horario_fechamento_padrao time not null default '18:00',
  -- Controla se a página pública mostra só o início do horário ("09:00")
  -- ou início e fim calculado do serviço ("09:00 - 09:30").
  mostrar_fim_servico_cliente boolean not null default false,
  assinatura_status text not null default 'trial', -- 'trial' | 'ativa' | 'atrasada' | 'cancelada'
  assinatura_valido_ate timestamptz,
  -- Mensagens do WhatsApp, editáveis pela barbearia (não são enviadas via API —
  -- viram um link wa.me que o admin clica e manda manualmente). Variáveis
  -- disponíveis: {{cliente}} {{barbearia}} {{barbeiro}} {{servico}} {{data}} {{hora}}
  mensagem_confirmacao text not null default 'Olá {{cliente}}! Seu agendamento na {{barbearia}} foi confirmado para {{data}} às {{hora}}, com {{barbeiro}}. Até lá! 💈',
  mensagem_lembrete text not null default 'Olá {{cliente}}! Passando pra lembrar que seu agendamento na {{barbearia}} é daqui a 1 hora, às {{hora}}, com {{barbeiro}}. Te esperamos! 💈',
  criado_em timestamptz not null default now()
);

-- Usuários donos/admins da barbearia (login)
create table usuarios (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid references barbearias(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id),
  nome text not null,
  email text unique not null,
  criado_em timestamptz not null default now()
);

-- Barbeiros
create table barbeiros (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid references barbearias(id) on delete cascade,
  nome text not null,
  foto_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Serviços oferecidos
create table servicos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid references barbearias(id) on delete cascade,
  nome text not null,
  duracao_min int not null,
  preco numeric not null,
  ativo boolean not null default true,
  mostrar_duracao boolean not null default true, -- se falso, cliente só vê nome + preço
  legenda text, -- descrição curta, pública (cliente vê)
  observacao_interna text -- notas do admin, nunca aparece pro cliente
);

-- Horários de trabalho por barbeiro (regras recorrentes)
create table horarios_trabalho (
  id uuid primary key default gen_random_uuid(),
  barbeiro_id uuid references barbeiros(id) on delete cascade,
  dia_semana int not null, -- 0=domingo ... 6=sábado
  hora_inicio time not null,
  hora_fim time not null
);

-- Bloqueios/folgas pontuais
create table bloqueios (
  id uuid primary key default gen_random_uuid(),
  barbeiro_id uuid references barbeiros(id) on delete cascade,
  data date not null,
  hora_inicio time,
  hora_fim time,
  motivo text
);

-- Clientes (sem necessidade de conta, identificado por telefone)
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone_whatsapp text not null,
  criado_em timestamptz not null default now()
);

-- Agendamentos
create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid references barbearias(id) on delete cascade,
  barbeiro_id uuid references barbeiros(id),
  servico_id uuid references servicos(id),
  cliente_id uuid references clientes(id),
  data_hora timestamptz not null,
  status text not null default 'pendente',
  -- 'pendente' | 'confirmado' | 'cancelado' | 'concluido' | 'aguardando_sinal'
  sinal_pago boolean default false,
  sinal_valor numeric,
  forma_pagamento text, -- 'dinheiro' | 'cartao' | 'pix' | null (definido pelo barbeiro ao concluir o atendimento)
  lembrete_enviado boolean default false,
  criado_em timestamptz not null default now()
);

create index idx_usuarios_barbearia on usuarios(barbearia_id);
create index idx_barbeiros_barbearia on barbeiros(barbearia_id);
create index idx_servicos_barbearia on servicos(barbearia_id);
create index idx_horarios_barbeiro on horarios_trabalho(barbeiro_id);
create index idx_bloqueios_barbeiro_data on bloqueios(barbeiro_id, data);
create index idx_agendamentos_barbearia on agendamentos(barbearia_id);
create index idx_agendamentos_barbeiro_data on agendamentos(barbeiro_id, data_hora);
create index idx_agendamentos_lembrete on agendamentos(data_hora) where lembrete_enviado = false;

-- RLS
alter table barbearias enable row level security;
alter table usuarios enable row level security;
alter table barbeiros enable row level security;
alter table servicos enable row level security;
alter table horarios_trabalho enable row level security;
alter table bloqueios enable row level security;
alter table clientes enable row level security;
alter table agendamentos enable row level security;

-- Leitura pública (necessária para a página pública de agendamento em app/b/[slug]).
-- Escrita fica restrita ao dono autenticado da barbearia (via auth_user_id em `usuarios`).
create policy "barbearias: leitura pública" on barbearias for select using (true);
create policy "barbeiros: leitura pública" on barbeiros for select using (ativo = true);
create policy "servicos: leitura pública" on servicos for select using (ativo = true);
create policy "horarios_trabalho: leitura pública" on horarios_trabalho for select using (true);
create policy "bloqueios: leitura pública" on bloqueios for select using (true);

create policy "usuarios: dono vê seu próprio registro" on usuarios for select
  using (auth_user_id = auth.uid());

create policy "barbearias: dono edita a própria" on barbearias for update
  using (id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

create policy "barbeiros: dono gerencia" on barbeiros for all
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()))
  with check (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

create policy "servicos: dono gerencia" on servicos for all
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()))
  with check (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

create policy "horarios_trabalho: dono gerencia" on horarios_trabalho for all
  using (barbeiro_id in (
    select b.id from barbeiros b join usuarios u on u.barbearia_id = b.barbearia_id
    where u.auth_user_id = auth.uid()
  ))
  with check (barbeiro_id in (
    select b.id from barbeiros b join usuarios u on u.barbearia_id = b.barbearia_id
    where u.auth_user_id = auth.uid()
  ));

create policy "bloqueios: dono gerencia" on bloqueios for all
  using (barbeiro_id in (
    select b.id from barbeiros b join usuarios u on u.barbearia_id = b.barbearia_id
    where u.auth_user_id = auth.uid()
  ))
  with check (barbeiro_id in (
    select b.id from barbeiros b join usuarios u on u.barbearia_id = b.barbearia_id
    where u.auth_user_id = auth.uid()
  ));

-- Clientes e agendamentos: criados pelo cliente final (anon) no fluxo público de agendamento,
-- e visíveis para o dono da barbearia correspondente. Escrita via anon fica restrita a insert
-- (nada de update/delete direto pelo cliente — mudanças de status passam por RPC/API).
create policy "clientes: qualquer um pode criar" on clientes for insert with check (true);
create policy "clientes: dono vê clientes da própria barbearia" on clientes for select
  using (id in (
    select a.cliente_id from agendamentos a
    join usuarios u on u.barbearia_id = a.barbearia_id
    where u.auth_user_id = auth.uid()
  ));

create policy "agendamentos: qualquer um pode criar" on agendamentos for insert with check (true);
create policy "agendamentos: dono vê e gerencia os da própria barbearia" on agendamentos for select
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));
create policy "agendamentos: dono atualiza os da própria barbearia" on agendamentos for update
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()))
  with check (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

-- ===== migrations/0004_email_notificacoes.sql =====
-- E-mail do cliente (usado pra confirmação/lembrete automáticos) e um token
-- de cancelamento por agendamento (link público que não exige login).
alter table clientes add column if not exists email text;
alter table agendamentos add column if not exists cancelamento_token uuid not null default gen_random_uuid();

create unique index if not exists idx_agendamentos_cancelamento_token
  on agendamentos(cancelamento_token);

-- ===== migrations/0005_aparencia.sql =====
-- Tema visual da barbearia (cor da marca; logo já tinha coluna própria
-- desde o schema inicial) e foto por serviço.
alter table barbearias add column if not exists tema jsonb not null default '{}'::jsonb;
alter table servicos add column if not exists imagem_url text;

-- Bucket público pra logo da barbearia e fotos de serviço. Leitura é
-- pública (o bucket é público, não passa por RLS); escrita só pro dono da
-- barbearia, restringindo pelo primeiro segmento do caminho do arquivo
-- (convenção: "{barbearia_id}/logo.ext" ou "{barbearia_id}/servicos/{id}.ext").
insert into storage.buckets (id, name, public)
values ('midia', 'midia', true)
on conflict (id) do nothing;

create policy "midia_owner_insert" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'midia'
    and (storage.foldername(name))[1] in (
      select barbearia_id::text from usuarios where auth_user_id = auth.uid()
    )
  );

create policy "midia_owner_update" on storage.objects for update
  to authenticated
  using (
    bucket_id = 'midia'
    and (storage.foldername(name))[1] in (
      select barbearia_id::text from usuarios where auth_user_id = auth.uid()
    )
  );

create policy "midia_owner_delete" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'midia'
    and (storage.foldername(name))[1] in (
      select barbearia_id::text from usuarios where auth_user_id = auth.uid()
    )
  );

-- ===== migrations/0006_midia_select_policy.sql =====
-- upload(..., { upsert: true }) precisa checar se já existe um arquivo no
-- mesmo caminho pra decidir entre inserir ou substituir — sem policy de
-- SELECT pro dono, essa checagem falha e o upsert é bloqueado pela RLS
-- mesmo em caminhos que o dono tem todo o direito de escrever. Leitura
-- pública (via URL pública do bucket) não depende disso; é só pro upsert
-- autenticado funcionar.
create policy "midia_owner_select" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'midia'
    and (storage.foldername(name))[1] in (
      select barbearia_id::text from usuarios where auth_user_id = auth.uid()
    )
  );

-- ===== migrations/0007_remover_sinal.sql =====
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

-- ===== migrations/0008_horarios_avancado.sql =====
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

-- ===== migrations/0009_leads_site_personalizado.sql =====
-- Registro de interesse em site personalizado (upsell manual, feito sob
-- encomenda) — sem UI de listagem por enquanto, o dono do Naviu confere via
-- SQL Editor ou recebe por e-mail (ver lib/email.ts).
create table if not exists leads_site_personalizado (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid references barbearias(id) on delete cascade,
  mensagem text,
  criado_em timestamptz not null default now()
);

alter table leads_site_personalizado enable row level security;

create policy "leads_site_personalizado: dono cria pedido" on leads_site_personalizado
  for insert
  with check (
    barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid())
  );

-- ===== migrations/0010_aparencia_avancada.sql =====
-- Capa (banner no topo, tipo Facebook) e descrição pro cliente ver — cor de
-- fundo já cabe dentro de barbearias.tema (jsonb), sem precisar de coluna.
alter table barbearias add column if not exists capa_url text;
alter table barbearias add column if not exists descricao text;

-- ===== migrations/0011_assinatura_asaas.sql =====
-- Assinatura do Naviu pelo Asaas (substitui a Kiwify).
--
-- O estado que o app consulta (plano, limite, status, validade) continua em
-- `barbearias`, mas agora só o servidor pode mudá-lo: antes o dono podia dar
-- UPDATE na linha inteira pelo navegador e se dar plano/assinatura de graça.
-- Os ids do Asaas e o link da fatura ficam numa tabela à parte, porque
-- `barbearias` tem leitura pública.

-- 1. Dono só edita os campos de perfil/aparência da própria barbearia.
revoke update on barbearias from anon, authenticated;
grant update (
  nome,
  endereco,
  telefone_whatsapp,
  logo_url,
  capa_url,
  descricao,
  tema,
  horario_fechamento_padrao,
  mostrar_fim_servico_cliente,
  mensagem_confirmacao,
  mensagem_lembrete
) on barbearias to authenticated;

-- 2. Dados da cobrança no Asaas. Só o servidor (service_role) escreve.
create table if not exists assinaturas (
  barbearia_id uuid primary key references barbearias(id) on delete cascade,
  plano text not null check (plano in ('solo', 'barbearia')),
  valor numeric(10, 2) not null,
  -- 'cartao' renova sozinho no cartão; 'pix_boleto' gera uma fatura por mês.
  forma text not null default 'cartao' check (forma in ('cartao', 'pix_boleto')),
  asaas_cliente_id text,
  asaas_assinatura_id text unique,
  -- Link da fatura em aberto, pro botão "Pagar agora".
  fatura_url text,
  atualizado_em timestamptz not null default now()
);

revoke all on assinaturas from anon, authenticated;
grant select on assinaturas to authenticated;
alter table assinaturas enable row level security;
create policy "assinaturas: dono vê a da própria barbearia" on assinaturas for select
  using (barbearia_id in (select barbearia_id from usuarios where auth_user_id = auth.uid()));

-- 3. Até aqui o teste nunca bloqueava ninguém. Quem está em teste (vencido
-- ou sem data) ganha 14 dias a partir de agora, pra não ser cortado de surpresa.
update barbearias
set assinatura_valido_ate = now() + interval '14 days'
where assinatura_status = 'trial'
  and (assinatura_valido_ate is null or assinatura_valido_ate < now() + interval '14 days');

-- Contas marcadas como pagas sem data de validade (ajuste manual) não podem
-- ser bloqueadas de uma hora pra outra: ganham 30 dias.
update barbearias
set assinatura_valido_ate = now() + interval '30 days'
where assinatura_status in ('ativa', 'atrasada') and assinatura_valido_ate is null;

-- ===== migrations/0012_cliente_por_barbearia_e_trava_horario.sql =====
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

-- ===== migrations/0013_faltas_confirmacao_lista_espera.sql =====
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

-- ===== migrations/0014_categorias_aniversario.sql =====
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

-- ===== migrations/0015_financeiro.sql =====
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
--
-- Só acrescenta: seguro de rodar com o site no ar.

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

-- ---------------------------------------------------------------------------
-- 7) Clientes sumidos (0016)
-- ---------------------------------------------------------------------------

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
