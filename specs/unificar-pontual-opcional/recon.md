# Unificar Opcional em Pontual (issue #39)

**Decisão tomada:** todo gasto "Opcional" vira "Pontual". O tipo Opcional deixa de existir.
Depois da mudança, o gasto tem três tipos: **Fixo**, **Pontual** e **Dívida** (esta última
nunca é escolhida pelo usuário).

## O que existe hoje

`Opcional` e `Pontual` são idênticos no comportamento. O rateio, o acerto e as regras só
olham se o gasto é `fixed` ou não. A diferença está no rótulo, na cor, na fatia do Donut e
nas opções dos selects. Detalhes na análise da issue.

## Plano (o "protótipo" desta chore)

Não há tela nova. O que o usuário vê muda assim:

| Onde | Hoje | Depois |
|---|---|---|
| Select de tipo no lançamento, na edição e no filtro | Fixo / Opcional / Pontual | Fixo / Pontual |
| Donut (Minha visão e Família) | 3 fatias | 2 fatias: Fixo e Pontual |
| Chip do tipo no extrato | 3 cores | 2 cores (Pontual mantém o roxo) |
| Texto do dashboard (`MyDashboard.tsx:85`) | "...gasto opcional ou pontual — é aí que dá pra mexer sem mudar de vida." | ver pergunta 1 |

### Backend
1. **Migração Prisma** (commitada junto):
   - `UPDATE "Expense" SET "expenseType" = 'ONE_OFF' WHERE "expenseType" = 'OPTIONAL'`;
   - o Postgres não remove valor de enum, então recria o tipo sem `OPTIONAL` (novo enum, `ALTER COLUMN ... USING`, drop do antigo).
   - O único uso do enum é `Expense.expenseType` (`schema.prisma:236`).
2. `shared/domain.ts`: `EXPENSE_TYPES = ['fixed', 'oneOff']`.
3. `build-statement.ts` e `types.ts`: remove `optionalCents` e o ramo `optional`.
4. `reports.service.ts` e `shared/contracts.ts`: remove o campo `optional` do consolidado (quebra de contrato; o front é o único consumidor).
5. `expenses.service.ts`: tira `OPTIONAL` dos mapeamentos `expenseTypeOf` e `toDbExpenseType`.
6. `seed.ts`: gastos `O` passam a `ONE_OFF`.

### Arquivos de export/import interno (compatibilidade)
- Arquivos já exportados têm `"expenseType": "optional"`. O `parse.ts` passa a aceitar `optional` e converter para `oneOff` ao ler. Sem isso, o arquivo antigo seria rejeitado.
- O fingerprint de duplicidade (`fingerprint.ts`) usa o tipo. Normalizar antes de calcular, para que reimportar um export antigo sobre dados já migrados não duplique gastos.
- A `version` do formato fica em 1, porque o formato não muda; só um valor deixa de existir.

### Frontend
- `Donut.tsx`: remove a prop `optional`, a fatia e o badge.
- `FamilyDashboard.tsx` e `MyDashboard.tsx`: param `optional` sai, `nonFixedTotal` vira só `oneOff`.
- `ExpensesLedger.tsx`: 3 listas de opções e 2 rótulos inline perdem "Opcional".
- `ui.tsx`: tira `optional` dos mapas de rótulo e cor; atualiza `ui.regression.test.tsx`.

### Testes a ajustar
`calculate-shares.spec.ts`, `parse.spec.ts`, `months.e2e-spec.ts`, `internal-export-import.e2e-spec.ts`, mais um teste novo para `optional` virando `oneOff` no import.

## Mudanças de comportamento existente (precisam de OK)

1. Gastos que hoje são Opcional passam a Pontual **em produção**, de forma irreversível: depois da migração não dá mais para saber quais eram opcionais.
2. O gráfico perde uma fatia e a mensagem do dashboard muda.
3. O contrato do relatório consolidado perde o campo `optional`.

## Perguntas em aberto

1. **Texto do dashboard.** Sem "opcional", a frase "é aí que dá pra mexer sem mudar de vida" fica menos precisa, porque Pontual também inclui conserto e presente. Sugestão: *"Mais de um terço da sua cota é gasto pontual — é aí que dá pra mexer sem mudar de vida."* Pode ser outro texto?
2. **Aceitar `optional` em arquivos de export antigos** (sugestão: sim, converte para `oneOff`). Ou prefere rejeitar?
3. **Backup antes do deploy.** Sugestão: criar um snapshot/branch no Neon antes de aplicar a migração em produção, já que ela é irreversível. Pode ser?

## Riscos

- Migração de enum mexe na coluna inteira. Em volume pequeno é rápido, mas o `ALTER COLUMN ... USING` trava a tabela por instantes.
- Um export antigo reimportado depois da migração só fica correto se a normalização do fingerprint for feita.
