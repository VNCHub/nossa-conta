# Novas categorias de gasto: Estudo, Transporte, Presentes

**Resumo:** categorias são uma lista fixa em `shared/src/domain.ts`. Adicionar três é uma
mudança de poucas linhas, **sem migração de banco** e sem mexer no motor de rateio.

## O que existe hoje

- `CATEGORIES` (`shared/src/domain.ts`) tem 8 itens: Carro, Casa, Passeio, Assinaturas,
  Comida, Pets, Jogos, Outros. Cada um tem `id` (inglês), `name` (pt-BR) e `color`.
- No banco, `Expense.category` é `String?` (texto livre, não enum). **Nenhuma migração.**
- A validação do backend (`@IsIn(CATEGORY_IDS)` no DTO e o parse da importação interna)
  deriva da mesma lista, então passa a aceitar as novas sozinha.
- O frontend também lê da lista: selects do ledger e do formulário de novo gasto, chip,
  gráfico "por categoria" (`Categories` em `ui.tsx`) e `CategoryExpensesModal`.
- `categoryOf(id)` devolve o **último** item da lista quando o id é desconhecido
  (hoje, "Outros").

## O que muda

Três entradas novas em `CATEGORIES`:

| id | Nome | Cor (proposta) |
|---|---|---|
| `study` | Estudo | `#A38A2E` (dourado) |
| `transport` | Transporte | `#6B8E3A` (verde-oliva) |
| `gifts` | Presentes | `#C2547F` (rosa) |

Arquivos tocados: `shared/src/domain.ts` e os testes que contam/listam categorias
(`frontend/src/shared/domain.unit.test.ts`). O resto se atualiza sozinho.

## Riscos e achados

- **"Outros" precisa continuar por último.** O fallback de `categoryOf` depende disso. As
  novas entram *antes* dele.
- **Ordem na lista = ordem nos selects.** O gráfico por categoria ordena por valor, então
  não é afetado.
- **Cores:** precisam ser distintas das 8 atuais para o gráfico e o chip ficarem legíveis.
- **Exportação/importação interna:** um arquivo exportado com as categorias novas seria
  rejeitado por uma versão antiga do app. Só importa se houver instâncias em versões
  diferentes. Não vejo impacto prático.
- Gastos existentes não mudam; nenhum é reclassificado.

## Mudanças de comportamento existente

Nenhuma. É só acréscimo.

## Decisões já tomadas

- Categorias: Estudo, Transporte, Presentes (pedido do usuário).

## Decisões (respondidas)

- Transporte convive com Carro; Carro não muda.
- Ids e nomes confirmados: `study`/Estudo, `transport`/Transporte, `gifts`/Presentes.
- Cores escolhidas pelo agente (tabela acima), distintas das 8 atuais.
- Protótipo dispensado.

## Perguntas em aberto

Nenhuma.
