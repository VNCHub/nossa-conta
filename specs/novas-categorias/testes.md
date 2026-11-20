# Roteiro de teste: novas categorias

Rode o app a partir do worktree `nossa-conta-categorias` (branch `feat/new-expense-categories`).

1. Na tela **Gastos**, clique em **novo gasto**. Abra o select **Categoria**: devem aparecer
   Estudo, Transporte e Presentes, com **Outros por último**.
2. Lance um gasto de cada uma das três categorias novas.
3. Na tabela, o chip de cada um mostra o nome e a cor certos (dourado, verde-oliva, rosa).
4. Em um gasto existente, troque a categoria direto na tabela para uma das novas e confirme
   que salva.
5. No **Meu painel** e no painel da família, o gráfico "por categoria" mostra as três
   com cores distintas das outras. Clique numa barra: abre a lista de gastos dela.
6. Busque "estudo" na busca do ledger: o gasto aparece.
7. No celular (ou janela estreita), confira o select de categoria.
8. Um gasto antigo (Comida, Carro, etc.) continua como estava.
