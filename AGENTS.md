# AGENTS.md

Guia para agentes de IA trabalhando neste repositório. `CLAUDE.md` é um link para
este arquivo — mantenha só este.

## O que é

**Nossa Conta** — controle financeiro para quem divide as contas. Cada pessoa lança o
que ganhou e o que gastou; no fim do mês o sistema calcula a cota de cada um pela regra
de rateio da família e diz **quem paga quanto para quem**.

Visão geral técnica: [`README.md`](README.md).

## Estrutura

```
backend/    NestJS 11 + Prisma 6 + Postgres. API REST.
frontend/   React 19 + Vite 6 + Mantine 9 + TanStack Query.
shared/     Tipos e constantes usados pelos dois lados (import via @shared).
```

## Convenções que não são óbvias no código

- **Código em inglês, texto de usuário em português.** Identificadores, nomes de arquivo,
  comentários e mensagens de commit em inglês. Só fica em português o que é exibido ao
  usuário: rótulos de UI, textos de toast, mensagens de erro/validação, dados de seed.
- **Rotas HTTP continuam em português** — `/familias/minha`, `/gastos`, `/entradas`,
  `/regras`, `/relatorios/consolidado`, o query param `?mes=`, os sub-paths `entrar`,
  `minha/membros`, `:id/pesos`, `:id/medicoes`. Só os caminhos de URL; corpo e resposta
  JSON usam campos em inglês.
- **Comentários explicam o *porquê*, não o *quê*.** O estilo do repo é comentário curto
  que justifica uma decisão (veja `family.guard.ts`, `expenses.service.ts`). Não comente o
  óbvio.
- Import de código compartilhado é sempre `@shared` / `@shared/*`, nunca caminho relativo
  para `../../../shared`.

## Arquitetura do backend — a regra que sustenta o resto

```
Controller  → HTTP, valida o DTO, lê req.user. Não sabe o que é Prisma.
Service     → regra de negócio e autorização. Não monta query.
Repository  → único ponto que fala com o banco. Todo método recebe familyId.
Domain      → funções puras de rateio (domain/split/). Sem banco, HTTP nem framework.
```

- **Isolamento entre famílias é estrutural.** Todo método de repository exige `familyId`,
  que vem *sempre* do token (`req.user`) e *nunca* do corpo da requisição. Não crie um
  caminho onde o filtro possa ser esquecido. Acesso a registro de outra família responde
  `404`, não `403`.
- **Rotas nascem protegidas.** `JwtAuthGuard` é global; só sai da proteção com `@Public()`
  explícito.
- **Dinheiro é inteiro de centavos dentro do motor de rateio.** A soma das cotas fecha
  exatamente o valor do gasto; o centavo que sobra vai para quem tem o maior resto. Nunca
  faça aritmética financeira com float. Use `toCents` / `toReais` de `domain/split`.
- O domínio de rateio (`backend/src/domain/split/`) é puro de propósito — é a parte onde
  um bug significa alguém pagando errado. Mantenha sem dependências de Nest/Prisma para
  continuar testável em milissegundos.

## Frontend

- Mantine 9 é a biblioteca de componentes. Formulários: `@mantine/form`. Datas:
  `@mantine/dates` em pt-BR. Exclusões: `modals.openConfirmModal` — **nada é apagado sem
  confirmação**, e toda escrita devolve um toast (`src/feedback.ts`).
- Identidade visual vive em `src/theme/theme.ts` como tokens do Mantine. Componente
  próprio é React puro consumindo as mesmas CSS variables. `src/styles/base.css` tem ~40
  linhas — mantenha enxuto.
- Rotas carregam sob demanda. `@mantine/charts` (~105 kB) é importado **só** em
  `components/Donut.tsx`. Não importe charts em outro lugar.
- Chamadas à API passam por `src/api/client.ts` e pelos hooks de `src/api/hooks.ts`
  (TanStack Query, com as `keys` centralizadas). Não use `fetch` direto nas páginas.

## Comandos

Backend (`cd backend`):

```bash
npm run start:dev        # API com watch
npm test                 # 37 testes do motor de rateio (domain/split/*.spec.ts)
npm run test:e2e         # 18 testes de fronteira entre famílias (test/*.e2e-spec.ts: isolamento + ações críticas da família, precisa do Postgres)
npx tsc --noEmit         # checagem de tipos (roda no CI)
npm run lint             # eslint
npm run prisma:migrate   # cria migração em dev
npm run seed             # recria a família de demonstração
```

Frontend (`cd frontend`):

```bash
npm run dev              # Vite
npm run build            # tsc -b && vite build
npm run lint             # tsc --noEmit
```

Projeto inteiro: `docker compose up --build` (Postgres na porta **5433** do host).

## Antes de considerar uma mudança pronta

1. `cd backend && npx tsc --noEmit && npm test` — e `npm run test:e2e` se mexeu em
   repository, guard ou qualquer coisa perto da fronteira entre famílias.
2. `cd frontend && npm run lint && npm run build` se tocou no front.
3. Mudança de schema Prisma exige migração (`npm run prisma:migrate`) commitada junto.
4. O CI (`.github/workflows/ci.yml`) roda tudo isso em Node 24 — não deixe passar o que
   ele pegaria.

## Fora do escopo (MVP)

Gasto parcelado ou recorrente, múltiplas famílias por usuário, upload de comprovante,
notificação de fechamento do mês. Não implemente sem pedido explícito.
