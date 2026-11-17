# Nzila

> **Chegue seguro. Saia explorando.**

A Nzila está a ser construída para ajudar pessoas a descobrir Luanda com mais
tranquilidade: encontrar lugares interessantes, pedir uma viagem e contar com
apoio local quando for preciso.

Este repositório reúne a aplicação móvel e a API que a serve. O projeto está em
desenvolvimento; algumas funcionalidades dependem de serviços externos e da
configuração descrita abaixo.

## O que encontrará aqui

- **Aplicação móvel** — Expo, React Native e Expo Router, com navegação,
  autenticação, mapa, lugares e viagens.
- **API** — Fastify e Drizzle ORM, com endpoints para autenticação, viagens,
  motoristas, lugares, apoio, avaliações, administração e integração com
  WhatsApp.
- **Código partilhado** — tipos, schemas, estados e textos usados pelos
  diferentes pacotes.
- **Dados e serviços** — PostgreSQL/Supabase para persistência e serviços
  relacionados.

## Antes de começar

Instale:

- [Node.js](https://nodejs.org/) 22 ou superior
- [pnpm](https://pnpm.io/) 10
- Uma instância PostgreSQL/Supabase para executar a API e as migrações

Na raiz do projeto:

```powershell
pnpm install
```

## Configuração local

Crie os ficheiros locais de ambiente:

```powershell
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\mobile\.env.example apps\mobile\.env
```

Edite `apps\api\.env` e preencha as credenciais da sua instância. A API precisa
de `DATABASE_URL`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Para validar
tokens, configure também **uma** destas opções: `SUPABASE_JWT_SECRET` ou
`SUPABASE_JWKS_URL`.

Em `apps\mobile\.env`, ajuste `EXPO_PUBLIC_API_URL` para apontar à API. O valor
predefinido da API é `http://localhost:3333`. Num telemóvel físico, use o
endereço IP local do computador e mantenha a porta `3333`; o telemóvel e o
computador devem estar na mesma rede. As chaves do Supabase e do Google Maps
podem ser configuradas ali para ativar os serviços correspondentes.

> Os ficheiros `.env` são locais. Não partilhe nem envie chaves, palavras-passe
> ou credenciais para o repositório.

## Preparar a base de dados

Com as credenciais da API configuradas e a base de dados acessível, aplique as
migrações e os scripts SQL:

```powershell
pnpm --filter @nzila/api db:setup
```

Para carregar os dados de demonstração disponíveis:

```powershell
pnpm db:seed
```

## Executar em desenvolvimento

Abra **dois terminais** na raiz do repositório.

No primeiro, inicie a API e os pacotes partilhados:

```powershell
pnpm dev
```

No segundo, escolha como abrir a aplicação:

```powershell
# Navegador
pnpm --filter @nzila/mobile web

# Expo Go ou outro dispositivo/emulador
pnpm --filter @nzila/mobile start
```

Os comandos `android` e `ios` também estão disponíveis no pacote móvel:

```powershell
pnpm --filter @nzila/mobile android
pnpm --filter @nzila/mobile ios
```

A API fica, por predefinição, na porta `3333`. Pode confirmar que está ativa em
`http://localhost:3333/health`. O endpoint `/ready` também verifica a ligação à
base de dados.

## Verificações

Na raiz, pode executar:

```powershell
pnpm build
pnpm typecheck
pnpm test
pnpm lint
```

## Estrutura do repositório

```text
apps/
  api/       API Fastify, módulos de domínio e configuração da base de dados
  mobile/    Aplicação Expo para dispositivos móveis e web
packages/
  config/    Configuração TypeScript partilhada
  shared/    Tipos, schemas e lógica partilhada
```
