# Testes manuais: alerta ao fechar modal preenchido (#43)

Rode `docker compose up --build` (ou `npm run dev` no front e `npm run start:dev` no back) e entre com a família de demonstração.

## Em cada modal abaixo

| Modal | Onde abrir |
|---|---|
| Lançar gasto | Gastos → **Lançar gasto** |
| Lançar entrada | Entradas → **Lançar entrada** |
| Lançar dívida | tela de dívidas → **Lançar dívida** |
| Pagar dívida | uma dívida aberta → **Pagar** |
| Criar regra | Família → Regras → **Criar regra** |
| Nova importação | Gastos → Importações → **Nova importação** |

1. **Sem alterar nada**, feche por clique fora, `Esc`, `×` e **Cancelar**. Deve fechar direto, sem pergunta.
2. **Digite algo** (ou na importação, escolha um arquivo) e tente fechar pelos quatro caminhos. Deve aparecer "Descartar o que foi preenchido?".
   - **Continuar editando**: o modal continua aberto, com os dados.
   - **Descartar**: o modal fecha.
3. **Salve** um formulário preenchido. Deve fechar sem pergunta, com o toast de sempre.

## Casos específicos

- **Lançar dívida**: preencha, feche e **Descarte**. Ao reabrir, o formulário deve estar vazio.
- **Pagar dívida**: abre pré-preenchido. Fechar sem mexer em nada não pergunta. Mudar o valor e fechar pergunta.
- **Nova importação**: depois de concluir e chegar no resumo, **Concluir** e `Esc` fecham sem perguntar. Clique fora continua não fechando.
- **Exportar gastos**: continua fechando direto, sem pergunta.
- **Celular** (~390px): o toque em Cancelar ao lado de "Adicionar" também pergunta.
