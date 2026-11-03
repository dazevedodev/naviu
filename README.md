# Naviu

[![CI](https://github.com/dazevedodev/naviu/actions/workflows/ci.yml/badge.svg)](https://github.com/dazevedodev/naviu/actions/workflows/ci.yml)

**Agendamento online para barbearias.** O cliente marca o horário sozinho, pelo link da barbearia, e recebe confirmação e lembrete por e-mail.

No ar em **[naviu.app.br](https://naviu.app.br)**

![Página inicial do Naviu com o link de agendamento de uma barbearia](docs/inicio.webp)

## O problema

Barbearia pequena marca horário pelo WhatsApp: o barbeiro para o corte para responder, e o cliente esquece e falta. O Naviu deixa o cliente marcar a qualquer hora, sem falar com ninguém, e diminui as faltas com um lembrete automático uma hora antes.

## O que ele faz

**Para o cliente**

- Abre o link da barbearia (ou de um barbeiro específico), escolhe serviço, barbeiro e horário.
- Vê só os horários que estão livres de verdade.
- Recebe a confirmação por e-mail com o evento para salvar na agenda (`.ics`) e um link para cancelar.
- Recebe um lembrete por e-mail perto do horário.

**Para a barbearia**

- **Painel** com os agendamentos e opção de marcar um horário na mão.
- **Barbeiros e horários:** cada barbeiro com a sua grade semanal, em modo automático (início, fim, intervalo e pausa) ou com horários soltos, além de folgas.
- **Serviços** com preço e duração.
- **Aparência:** capa, descrição e cores da página pública da barbearia.
- **Compartilhar:** o link geral da barbearia e um link para cada barbeiro.
- **Aviso por e-mail** a cada novo agendamento.
- **Assinatura mensal** cobrada pelo Asaas; se o pagamento para, o acesso ao painel é bloqueado.

## Stack

| Parte | Tecnologia |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Banco e login | Supabase: Postgres com Row Level Security, Auth e Storage |
| E-mail | Resend |
| Pagamentos | Asaas (assinatura recorrente, com webhook) |
| Lembretes | rota `/api/cron/lembretes` chamada por um agendador externo a cada poucos minutos |
| Testes | Vitest |
| Hospedagem | Vercel |

O cálculo dos horários livres (`src/lib/slots.ts`) e as regras de assinatura (`src/lib/assinatura.ts`) têm testes automatizados.

## Rodando localmente

```bash
npm install
npm run dev
```

Copie `.env.local.example` para `.env.local` e preencha com as chaves do seu projeto Supabase, do Resend e do Asaas. Rode `supabase/schema.sql` e depois as migrações de `supabase/migrations/`, em ordem, no SQL Editor do Supabase.

## Testes

```bash
npm test
```

## Estrutura

```
src/app/b/[slug]        página pública e agendamento da barbearia
src/app/admin           painel da barbearia
src/app/api             agendamentos, horários livres, lembretes e webhooks
src/lib                 regras de horários, assinatura, e-mails e Asaas
supabase/               banco e migrações
```

---

Feito por [Daniel D'Azevedo](https://dazevedo.dev) · DAZEVEDO
