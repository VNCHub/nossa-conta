# Roteiro de teste manual: assistente de importação

Arquivos de teste (já em `~/Downloads`):
- `Nubank_2026-08-22.csv` e `Nubank_2026-09-22.csv` (faturas)
- `NU_78547262_01AGO2026_31AGO2026.csv` (extrato da conta)

Suba o ambiente com `docker compose up --build` e entre com um usuário que tenha família.

## 1. Etapa de arquivos
1. Importações → **Nova importação**. O modal mostra 3 etapas: Arquivos, Decisões, Resumo.
2. Escolha Nubank e envie os 3 arquivos juntos. O botão **Continuar** fica ativo.
3. Clique em Continuar. Nada deve aparecer na lista de Importações ainda.

## 2. Etapa de decisões
4. Deve aparecer "Unificar gastos Decathlon?" (2 lançamentos, julho) e "Unificar parcelas de Mp *Mercadolivre?" (parcelas 1/6 e 2/6, agosto).
5. Abra "Ver os lançamentos" nos dois. O resultado mostra 1 gasto de R$ 363,98 e 1 gasto de R$ 64,39.
6. Troque um para "Manter separados". O resultado passa a mostrar os gastos separados.
7. Não deve haver oferta para `Mp *Melimais` (meses diferentes) nem para `Good Auto Center` (parcelas em meses diferentes).
8. Em "Entradas recebidas" devem aparecer 4 créditos, todos aceitos por padrão. Desmarque um e confira o total aceito.

## 3. Resumo
9. Clique em **Importar**. Aparece um loading e depois o resumo.
10. O resumo mostra gastos importados, entradas importadas e não importados, com o motivo de cada um: unificados, entradas não aceitas, pagamento de fatura.
11. Em Gastos, agosto: o pagamento do boleto da SABESP aparece com meio de pagamento **Boleto**.

## 4. Repetir a importação
12. Importe de novo os mesmos arquivos. Cada um deve ser recusado ("já foi importado antes") ainda na etapa 1 ou 2.
13. Importe um extrato que se sobrepõe a um já importado. Os lançamentos repetidos aparecem em "Já existe no sistema".

## 5. Importação interna (só admin)
14. Origem **Interno** com um `.json` exportado. A etapa 2 diz que nada pede decisão, e o resumo lista os gastos importados.

## Conhecido
- Valores de fatura com ponto de milhar (ex.: `- 1.146,46`) são lidos como R$ 0,00 pelo parser. Já era assim antes do assistente e ainda não foi corrigido.
- Um lançamento em mês finalizado continua rejeitando o arquivo inteiro. Só as entradas aceitas em mês finalizado são puladas e listadas no resumo.
