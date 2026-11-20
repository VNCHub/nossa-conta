# Entradas em tabela única (issue #38)

## O que existe hoje

`frontend/src/pages/Income.tsx` mostra dois cards lado a lado:

- **Recorrentes em <mês>**: as recorrentes ativas no mês (`recurringAppliesToMonth`), com
  badges "todo dia N", "desde", "até".
- **Pontuais de <mês>**: as pontuais com `date` no mês, com a data e o badge
  "Recebimento de dívida" quando a entrada veio de um pagamento de dívida.

Cada linha tem a lixeira. Para recorrente, a lixeira abre `confirmChoice` (remover todo o
histórico ou remover deste mês em diante). Para pontual, abre `confirmDelete`. O recebimento
de dívida não pode ser removido daqui.

A mudança é **só de frontend**. `IncomeDTO` já tem tudo o que a tabela precisa (`type`,
`dayOfMonth`, `since`, `until`, `date`, `debtPaymentId`). Backend, contrato e rateio ficam
como estão.

## Plano

Uma tabela única no lugar dos dois cards, no padrão visual da tabela de Gastos
(`ExpensesLedger.tsx`): cabeçalho com rótulos, linhas sem borda, cantos arredondados só nas
pontas e cards empilhados no celular.

| Coluna | Recorrente | Pontual |
|---|---|---|
| Data | dia `dayOfMonth` no mês visto (`05/11/2026`). Se o dia não existe no mês (31 em novembro), usa o último dia. | `date` |
| Descrição | descrição, com "desde Jan/2026" em cinza embaixo | descrição + badge "Recebimento de dívida" quando houver |
| Tipo | chip **Recorrente** | chip **Pontual** |
| Repete nos próximos meses | **Sim** (sem `until`) · **Até Mar/2027** (`until` depois do mês) · **Não** (`until` igual ao mês) | **—** |
| Valor | valor | valor |
| (ação) | lixeira, mesmo `confirmChoice` de hoje | lixeira, mesmo `confirmDelete`; desabilitada se for recebimento de dívida |

- Ordem: data crescente; empate por descrição.
- O card de total no cabeçalho e o botão "Lançar entrada" não mudam.
- Lista vazia: um único `Empty` ("Nenhuma entrada em novembro de 2026.").
- Mês fechado: banner e lixeiras desabilitadas como hoje.
- Celular (`< sm`): um card por entrada com data e lixeira no topo, descrição, e os chips de
  tipo e de repetição na linha de baixo, com o valor à direita.

### Arquivos

- `frontend/src/pages/Income.tsx`: troca o `Grid` de dois cards por `IncomeTable` +
  `MobileIncomeCard`. Remove `RecurringRow` e `OneOffRow`. Função pura
  `incomeDateInMonth(item, month)` para a data da recorrente.
- `frontend/src/components/ui.tsx`: `IncomeTypeChip` ao lado de `ExpenseTypeChip`
  (Recorrente em petrol, Pontual em grape, igual às cores de Fixo/Pontual dos gastos).
- Teste de regressão (vitest) da data e do texto "Repete", no estilo de
  `ui.regression.test.tsx`.

Sem mudança em backend, Prisma ou `@shared`.

## Mudanças de comportamento existente

1. Os badges "todo dia N" e "até <mês>" deixam de aparecer. O dia vira a data na coluna
   Data e o "até" vira a coluna Repete.
2. A recorrente que não repete passa a mostrar "Não" de forma explícita. Hoje ela só aparece
   com "até <mês atual>".

## Perguntas em aberto

1. **Colunas ordenáveis** como em Gastos? Sugestão: não por enquanto. São poucas linhas por
   mês e a ordem por data resolve.
2. **Data da recorrente**: mostrar a data no mês visto (`05/11/2026`) ou o texto
   "todo dia 5"? Sugestão: a data, para a coluna ficar uniforme e ordenável.
3. **"desde <mês>"** embaixo da descrição: manter (sugestão) ou tirar?
