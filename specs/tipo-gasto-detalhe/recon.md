# Tipo de gasto clicável no "Meu painel"

## Resumo
No card **Tipo de gasto** do Meu painel, clicar em **Fixo** ou **Pontual** abre um modal
listando os gastos daquele tipo, igual ao modal de "Onde o dinheiro foi".

## O que existe hoje
- `MyDashboard.tsx`: card "Tipo de gasto" renderiza `<Donut fixed oneOff />` (só exibição).
- `Categories` (em `ui.tsx`) já aceita `onSelect`; ao clicar abre `CategoryExpensesModal`.
- `CategoryExpensesModal` filtra `calc.lines` por `category === categoryId` e cota > 0 do
  usuário, ordena por data desc, mostra total da cota no título e, por gasto: descrição,
  data, quem pagou, valor, regra de rateio e a cota de cada participante.
- Cada `StatementLine` já traz `expenseType` ('fixed' | 'oneOff'), então **não precisa de
  mudança no backend nem no `shared`**. O total do donut (`d.fixed`/`d.oneOff`) usa o mesmo
  critério (`build-statement.ts`), então a soma do modal bate com o número do card.

## O que a feature muda
- `Donut.tsx`: os blocos "Fixo" e "Pontual" (badge + valor) viram botões clicáveis via
  prop opcional `onSelect(type)`; fatias do gráfico também podem ser clicáveis (ver pergunta 2).
  Sem a prop, o `Donut` continua só de exibição (o `FamilyDashboard` não muda).
- Modal: generalizar `CategoryExpensesModal` para filtrar por categoria **ou** por tipo
  (extrair o corpo da lista, ou aceitar um `filter` + `title`), sem duplicar a lista.
- `MyDashboard.tsx`: estado `selectedType` e renderização do modal.

## Mudanças de comportamento existente
Nenhuma: o card só ganha interação. Painel da casa e Donut sem `onSelect` ficam iguais.

## Riscos
- Duplicar o modal inteiro (~100 linhas) — evitado reutilizando.
- Acessibilidade/mobile: alvo de toque ≥ 44px nos botões, como o resto dos modais.
- `Donut.tsx` é o único que importa charts; continuo sem importar charts em outro lugar.

## Decisões
1. Painel da casa **não** muda por enquanto; só o Meu painel.
2. Clique vale nos blocos Fixo/Pontual **e** na fatia do gráfico.
3. Títulos "Gastos fixos" / "Gastos pontuais", com "sua cota: R$ x" embaixo.

4. (Achada no teste no navegador.) A soma do modal divergia 1 centavo do card: float no
   front × centavos no motor. `StatementLine` ganhou `shareCents` (centavos inteiros por
   participante) e os modais somam isso. Mudança aditiva no contrato, nenhum campo existente
   muda; vale também para o modal de categoria.

## Perguntas em aberto
Nenhuma.
