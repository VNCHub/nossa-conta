# Roteiro de teste: unificar Opcional em Pontual (issue #39)

**Antes de começar:** o banco local já tem a migração aplicada. Suba o projeto com
`docker compose up --build` (ou `npm run start:dev` no backend e `npm run dev` no front).
Se quiser dados de demonstração novos, rode `npm run seed` no backend.

## Já verificado pelo agente

- Backend: `tsc` limpo, 101 testes unitários e 56 e2e passando.
- Front: lint, build e 45 testes passando.
- Migração testada num banco descartável: `OPTIONAL` virou `ONE_OFF`; os outros tipos e o gasto sem tipo ficaram iguais.
- Não rodado: `npm run lint` do backend (`eslint` não está instalado no ambiente).

## Passos para você

1. **Lançar gasto.** Em Gastos, clique em "Lançar gasto" e abra o campo Tipo.
   *Esperado:* só aparecem **Fixo** e **Pontual**.
2. **Editar na tabela.** Clique no chip de tipo de um gasto já lançado.
   *Esperado:* as opções são Fixo e Pontual, e a troca grava com toast.
3. **Gastos antigos.** Procure um gasto que antes era Opcional (no seed: "Jogo novo", "Cinema", "Feira").
   *Esperado:* aparece como **Pontual**, com o chip roxo.
4. **Filtro por tipo** no extrato.
   *Esperado:* sem "Opcional"; filtrar por Pontual lista também os antigos opcionais.
5. **Meu painel.** Veja o gráfico "Tipo de gasto".
   *Esperado:* 2 fatias (Fixo e Pontual); o valor de Pontual é a soma do que era Opcional mais Pontual. O total no centro não mudou em relação a antes.
6. **Texto do painel.** Se mais de um terço da cota for Pontual, a frase é "Mais de um terço da sua cota é gasto pontual — é aí que dá pra mexer sem mudar de vida."; senão, "Sua base fixa domina o mês...".
7. **Painel da família.** Mesmo gráfico, 2 fatias, com o total igual ao de antes.
8. **Acerto do mês.** Confira "quem paga quanto para quem" de um mês com dados.
   *Esperado:* idêntico ao de antes da mudança. O tipo não afeta o rateio.
9. **Export antigo.** Use um arquivo gerado por "Exportar dados" antes da mudança (com `"expenseType": "optional"`) e importe.
   *Esperado:* importa sem erro. Gastos que já existem no banco não são duplicados.
10. **Exportar de novo.**
    *Esperado:* o arquivo novo só tem `fixed` e `oneOff`.

## Antes do deploy (etapa 5)

Criar um snapshot ou branch no Neon antes de aplicar a migração em produção, porque
depois dela não dá para saber quais gastos eram Opcional.
