# Grana a Dois

Controle financeiro para quem divide as contas. Cada pessoa lança o que ganhou e o que
gastou; no fim do mês o sistema calcula a cota de cada um conforme a regra de rateio
escolhida e diz **quem paga quanto para quem**.

- Requisitos de produto: [`docs/requisitos.md`](docs/requisitos.md)
- Protótipo visual que serviu de especificação: [`docs/prototipo.jsx`](docs/prototipo.jsx)

## Subir o projeto

Pré-requisitos: Docker com Compose v2+.

```bash
cp .env.example .env      # ajuste os segredos JWT antes de qualquer uso real
docker compose up --build
```

| Serviço  | Endereço                | Observação                          |
| -------- | ----------------------- | ----------------------------------- |
| Frontend | http://localhost:5173   | Vite com hot reload                 |
| API      | http://localhost:3000   | `GET /health` confirma o banco      |
| Postgres | localhost:5433          | porta do host, configurável no .env |
| Adminer  | http://localhost:8080   | `docker compose --profile ferramentas up` |

Banco e dados de demonstração:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

O seed recria a família do protótipo (`Casa da Vila Nova`, convite `VILA-7K2M`) com três
membros e 16 gastos em setembro/2026. Entre com **vinicius@email.com / 123456**.

> A porta do Postgres no host é 5433 e não 5432 para não conflitar com outros projetos.
> Mude `POSTGRES_PORT` no `.env` se preferir outra.

## Como o código está organizado

```
backend/src/
  domain/rateio/      motor de cálculo puro — sem banco, sem HTTP, sem Nest
  modules/<área>/     controller → service → repository
  common/             guards, decorators e filtros compartilhados
frontend/src/
  api/                cliente HTTP e hooks do TanStack Query
  pages/              uma tela por rota
  components/         peças de UI reaproveitadas
shared/src/           tipos e constantes usados pelos dois lados
```

A regra que sustenta o resto:

```
Controller  → HTTP, valida o DTO, lê req.user. Não sabe o que é Prisma.
Service     → regra de negócio e autorização. Não monta query.
Repository  → único ponto que fala com o banco. Todo método recebe familiaId.
Domain      → funções puras de rateio. Não conhece banco, HTTP nem framework.
```

O domínio isolado é o que permite testar o cálculo — a parte onde um bug significa
alguém pagando errado — em milissegundos e sem subir infraestrutura.

## Rateio

Cinco bases de cálculo, todas configuráveis por família:

| Base | Como divide |
| --- | --- |
| Partes iguais | igualmente entre os participantes |
| Renda recorrente | proporcional à entrada recorrente de cada um |
| Sobra livre | proporcional a (renda recorrente − gastos fixos individuais) |
| Percentual fixo | percentuais combinados uma vez |
| Medidor mensal | cada um lança sua medição do mês (km, dias, litros) e vira percentual |

O **medidor** é a resposta ao caso da gasolina: em vez de digitar percentuais todo mês,
cada pessoa lança quanto rodou e o sistema converte. É mais fácil de preencher e mais
fácil de auditar depois.

Duas decisões que valem saber:

- **Dinheiro é inteiro de centavos dentro do motor.** A soma das cotas fecha exatamente o
  valor do gasto — o centavo que sobra vai para quem tem o maior resto.
- **"Sobra livre" ignora os gastos compartilhados** ao calcular a sobra, de propósito:
  incluí-los criaria dependência circular, com a cota entrando no cálculo que a define.

## Privacidade

Os dados de uma família não aparecem para quem está fora dela. A garantia é estrutural:
todo método de repository exige `familiaId`, que vem sempre do token de quem está logado
e nunca do corpo da requisição — não existe caminho onde o filtro possa ser esquecido.
Acesso a registro de outra família responde `404`, não `403`, para não confirmar que ele
existe. `test/privacidade.e2e-spec.ts` monta duas famílias reais e tenta atravessar a
fronteira por todos os caminhos.

## Testes

```bash
cd backend
npm test          # 37 testes do motor de rateio
npm run test:e2e  # 10 testes de isolamento entre famílias (precisa do Postgres no ar)
```

## Deploy gratuito

| Camada | Serviço | Limite | Ressalva |
| --- | --- | --- | --- |
| Postgres | Neon | ~0,5 GB | suspende quando ocioso; religa em ~1s |
| API | Render (Docker) | 750h/mês | hiberna após ~15 min — a 1ª requisição do dia leva ~30s |
| Front | Vercel | 100 GB banda | — |

O `backend/Dockerfile` tem um estágio `prod` que roda `prisma migrate deploy` no boot, e
o `frontend/Dockerfile` gera um build estático servido por nginx. `PrismaService` conecta
com repetição justamente porque o Neon suspende bancos ociosos e a primeira conexão falha.

Variáveis obrigatórias em produção: `DATABASE_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `CORS_ORIGIN` (a origem do front) e `VITE_API_URL` no build do front.

Para uma família lançando gastos, 0,5 GB dá mais de uma década de dados.

## Fora do MVP

Gasto parcelado ou recorrente (só a entrada é recorrente hoje), múltiplas famílias por
usuário, upload de comprovante e notificação de fechamento do mês.
