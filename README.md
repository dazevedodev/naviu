# Naviu

Agendamento online para barbearias — link público, lembrete via WhatsApp (link `wa.me`, sem API) e sinal opcional via PIX.

Em produção em [naviu.vercel.app](https://naviu.vercel.app).

## Rodando localmente

```bash
npm install
npm run dev
```

Copie `.env.local.example` para `.env.local` e preencha com as chaves do seu projeto Supabase. Rode `supabase/schema.sql` (e as migrações em `supabase/migrations/`, em ordem) no SQL Editor do projeto antes do primeiro uso.

## Testes

```bash
npm test
```

## Deploy

Push na branch `main` faz deploy automático via Vercel (projeto `zantte/naviu`).
