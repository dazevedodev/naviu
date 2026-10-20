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
