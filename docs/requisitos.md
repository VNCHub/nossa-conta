Vamos gerar um prototipo visual de plataforma de controle financeiro para duas ou mais pessoas. O app precisa:

1. Permitir que cada usuario entre e coloque suas entradas (as entradas podem ser de 2 tipos, recorrentes e pontuais) e seus gastos mensais, esses gastos precisam ter
1.1. Data - Data da Transação Financeira
1.2. Tipo de Pagamento - Credito, Debito, Dinheiro, Pix 
1.3. Categoria1 - Carro, Casa, Passeio, Assinaturas, Comida, Pets, Jogos, Outros
1.3. Categoria2 - Gasto Fixo, Gasto Opcional
1.4. Descrição - Descrição do Gasto
1.5. Valor - Valor do Gasto
1.6. Dividir? - Se vai ser um gasto compartilhado com mais pessoas. Se sim, com quem. E qual o Rateio base?

2. Permitir que cada usuario entre em uma familia. (Um usuario pode convidar outro para sua familia, o que gera uma entidade no sistema chamada 'familia').

3. Permitir a visualizao dos gastos individuais, como % de gastos fixos e opcionais, representatividade de gastos de cada Categoria1

4. Permitir a visualizao dos gastos da familia, quanto cada um está recebendo de entrada. E quanto cada um esta gastando. Consolidando os dados preenchidos por todos, e apresentando um resumo final dos rateios, e quanto cada um tem que pagar ou receber.

5. Cada familia deve permitir que sejam cadastrados rateios para serem selecionados pelos membros na coluna 'divisao'. Por exemplo, rateio com base no salario de entrada de cada 1. Exemplo 2, rateio com base no salario livre de cada 1, (entrada recorrente - gastos fixos), ou rateios mais personalizados por exemplo. Um rateio em que cada mês os membros da familia tem que entrar e colocar uma % especifica para cada membro (vai funcionar assim no caso da gasolina, aceito sugestoes)

6. O sistema deve permitir o login de usuarios em suas contas, para preenchimento das informaçoes

7. as informações das familias devem ser privadas, acessiveis apenas para os usuarios dessa familia.

8. Todos os dados devem ser salvos em banco de dados, e futuramente vamos ter que pensar no deploy e como persistir esses dados de forma gratuita, é possivel? 

