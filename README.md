# Nzila Concierge

> **Chegue seguro. Saia explorando.**
> Luanda, Angola · Concierge local + transporte por motoristas parceiros.

Monorepo com app mobile (Expo + React Native + NativeWind), API (Fastify + Drizzle ORM) e
Supabase (Postgres, Auth, Storage e Realtime).

## Estrutura

```
apps/
  mobile/       # Expo Router + NativeWind (cliente e motorista)
  api/          # Fastify + Drizzle + Supabase
  backoffice/   # Painel operacional web (Kanban)
packages/
  shared/       # Enums, schemas Zod, máquina de estados e cópias
  config/       # tsconfig partilhado
```

## Desenvolvimento

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
pnpm build
pnpm test
pnpm dev
```

Consulte `docs/SETUP.md` para configurar Supabase, chaves, migrações, Google Maps e Expo.
