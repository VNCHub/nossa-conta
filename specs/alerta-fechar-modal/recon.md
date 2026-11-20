# Alerta ao fechar modal preenchido (issue #43)

## O que existe hoje

Todo modal de formulário é um `<Modal>` do Mantine com `onClose` ligado direto ao
`close` do `useDisclosure`. Clique fora, `Esc`, o `×` do cabeçalho e o botão
**Cancelar** fecham na hora e o que foi digitado some sem aviso.

| Modal | Onde | Estado do form | Observação |
|---|---|---|---|
| Lançar gasto | `pages/expenses/ExpensesLedger.tsx` (`ExpenseForm`) | `useForm` dentro do filho | É o caso da issue. Form desmonta ao fechar, então volta limpo. |
| Lançar entrada | `pages/Income.tsx` (`IncomeForm`) | `useForm` dentro do filho | Igual ao de gasto. |
| Lançar dívida | `components/debts.tsx` (`NewDebtModal`) | `useForm` **no mesmo componente do `<Modal>`** | O form não desmonta: quem fecha sem salvar e reabre encontra os dados antigos. |
| Pagar dívida | `components/debts.tsx` (`PayDebtForm`) | `useForm` dentro do filho | Já abre pré-preenchido. Só conta como alterado se mudar algo. |
| Criar regra de rateio | `pages/Family.tsx` (`CreateRuleForm`) | `useForm` controlado | Um campo de nome e a base. |
| Nova importação | `pages/expenses/ExpensesImports.tsx` (`ImportWizard`) | `useState` (arquivos, etapa, decisões) | Já tem `closeOnClickOutside={false}`, mas `Esc` e `×` ainda fecham. |
| Exportar gastos | `pages/expenses/ExportExpensesModal.tsx` | `useState` (escopo, datas) | Só filtros de download. Perder isso não custa nada. |

As edições inline da tabela de gastos (`ClickPopover`) salvam no clique e não entram aqui.

`@mantine/form` já expõe `form.isDirty()`, que compara os valores atuais com os iniciais,
inclusive no modo `uncontrolled` que quase todos esses forms usam. A confirmação pode
reutilizar `modals.openConfirmModal`, que já é o padrão de `feedback.tsx` e abre por cima
de um `<Modal>` aberto sem conflito.

A mudança é **só de frontend**. Backend, Prisma e `@shared` não mudam.

## Plano

### 1. `confirmDiscard` em `src/feedback.tsx`

Mesmo formato de `confirmDelete`:

- Título: **Descartar o que foi preenchido?**
- Texto: "Os dados digitados neste formulário serão perdidos."
- Botões: **Continuar editando** (padrão) e **Descartar** (vermelho `brick`).

### 2. `FormModal` em `src/components/FormModal.tsx`

Um wrapper de `<Modal>` que intercepta o fechamento:

```tsx
<FormModal opened={createOpen} onClose={createModal.close} title="Lançar gasto" …>
  <ExpenseForm … />
</FormModal>
```

- O formulário filho avisa se está alterado com um hook `useDirtyGuard(() => form.isDirty())`,
  lido por contexto. O pai não precisa saber de `form`, e os forms continuam onde estão.
- Clique fora, `Esc`, `×` e **Cancelar** passam pela mesma checagem: se o form está
  alterado, abre `confirmDiscard`. Se não está, fecha direto como hoje.
- O fechamento depois de salvar com sucesso **não** pergunta nada. Os forms já chamam
  `onClose()` no `onSuccess`, e o `FormModal` expõe `close()` (sem checagem) e
  `requestClose()` (com checagem) para separar os dois casos.

### 3. Aplicar nos modais

- **Lançar gasto**, **Lançar entrada**, **Pagar dívida**, **Criar regra**: trocar `Modal` por
  `FormModal` e registrar `form.isDirty()`. O botão Cancelar passa a chamar `requestClose`.
- **Lançar dívida**: mesmo tratamento. Também passa a chamar `form.reset()` ao descartar,
  para não reabrir com os dados antigos.
- **Nova importação**: "alterado" = há arquivo escolhido ou o wizard já passou da primeira
  etapa. Depois do resumo (importação concluída) fecha sem perguntar.
  Mantém `closeOnClickOutside={false}`.
- **Exportar gastos**: fica como está (ver Pergunta 3).

### 4. Testes

Teste de regressão (vitest + Testing Library) em `components/FormModal.regression.test.tsx`:

- form intocado → `Esc` fecha sem perguntar;
- form alterado → `Esc` abre a confirmação; **Continuar editando** mantém o modal e os
  dados; **Descartar** fecha;
- fechar pelo caminho de sucesso não pergunta.

Depois `npm run lint && npm run build && npm test`.

### Arquivos

- novo `frontend/src/components/FormModal.tsx`
- `frontend/src/feedback.tsx` (`confirmDiscard`)
- `frontend/src/pages/expenses/ExpensesLedger.tsx`, `pages/Income.tsx`, `components/debts.tsx`,
  `pages/Family.tsx`, `pages/expenses/ExpensesImports.tsx` + `ImportWizard.tsx`
- novo `frontend/src/components/FormModal.regression.test.tsx`

## Mudanças de comportamento existente

1. Clique fora, `Esc`, `×` e Cancelar num formulário alterado deixam de fechar direto.
2. **Lançar dívida** deixa de reabrir com os dados de uma tentativa descartada.
3. **Nova importação** passa a perguntar também no `Esc` e no `×` quando já há arquivo.

## Perguntas

1. **Cancelar também pergunta?** A issue fala do clique fora. Sugestão: sim, todos os
   caminhos de fechamento iguais. Cancelar está ao lado de "Adicionar" e é fácil errar o toque
   no celular.
2. **Escopo**: o título fala em "modal de gasto" e o texto em "os modais". Sugestão: todos os
   modais de formulário da tabela acima (exceto Exportar), via o mesmo `FormModal`.
3. **Exportar gastos** fica de fora? Sugestão: sim, são só filtros de download e refazer
   leva dois cliques.
4. **Texto da confirmação**: "Descartar o que foi preenchido?" com os botões
   "Continuar editando" / "Descartar". Ok ou prefere outro texto?
