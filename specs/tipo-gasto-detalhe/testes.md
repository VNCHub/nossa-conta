# Roteiro de teste — Tipo de gasto clicável

Rode o app (`docker compose up --build`, ou `npm run dev` no backend e no frontend), entre
com a família de demonstração e abra **Meu painel**.

1. No card **Tipo de gasto**, clique no bloco **Fixo**. Abre o modal "Gastos fixos".
   - "sua cota: R$ x" no título bate com o valor do bloco Fixo.
2. Feche e clique em **Pontual**. Abre "Gastos pontuais", com a cota igual à do bloco Pontual.
3. Clique na **fatia** de cada cor do gráfico: cada uma abre o modal do seu tipo.
4. Cada gasto mostra descrição, data, quem pagou, rateio e a cota de cada participante.
5. Num mês sem gastos de um tipo, o modal mostra "Nenhum gasto rateado para você neste tipo."
6. No celular (ou janela estreita): modal em tela cheia e blocos Fixo/Pontual fáceis de tocar.
7. Esconda os valores (ícone do olho): o clique continua funcionando, com valores mascarados.
8. "Onde o dinheiro foi" continua abrindo o modal de categoria normalmente.
9. Painel da casa: "Tipo de gasto na casa" **não** é clicável (como antes).
10. Centavos: em qualquer mês com gastos, "sua cota" do modal Fixo e a do Pontual devem ser
    **exatamente** o valor do bloco correspondente; o mesmo vale para cada categoria em
    "Onde o dinheiro foi".
