/**
 * Fills the database with the prototype's demo data (docs/prototipo.jsx), so the
 * family dashboard reproduces exactly the September/2026 numbers.
 * Password for everyone: 123456.
 */
import { PrismaClient, IncomeType, ExpenseType, RuleType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const MONTH = '2026-09';

async function main() {
  // Start from scratch: the seed is for development, not production.
  await prisma.expenseShare.deleteMany();
  await prisma.ruleMeasurement.deleteMany();
  await prisma.ruleWeight.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.splitRule.deleteMany();
  await prisma.user.updateMany({ data: { familyId: null } });
  await prisma.family.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await argon2.hash('123456');
  const [vinicius, camila, rafael] = await Promise.all([
    prisma.user.create({
      data: { name: 'Teste 1', email: 'teste1@email.com', passwordHash, color: '#1F5F52' },
    }),
    prisma.user.create({
      data: { name: 'Teste 2', email: 'teste2@email.com', passwordHash, color: '#B8452F' },
    }),
    prisma.user.create({
      data: { name: 'Teste 3', email: 'teste3@email.com', passwordHash, color: '#7A5AA6' },
    }),
  ]);

  const family = await prisma.family.create({
    data: {
      name: 'Família Teste',
      inviteCode: 'TESTE-0001',
      createdById: vinicius.id,
      members: { connect: [{ id: vinicius.id }, { id: camila.id }, { id: rafael.id }] },
    },
  });

  const rule = async (
    name: string,
    type: RuleType,
    description: string,
    extra?: {
      unit?: string;
      weights?: { userId: string; percent: number }[];
      measurements?: { userId: string; month: string; amount: number }[];
    },
  ) =>
    prisma.splitRule.create({
      data: {
        familyId: family.id,
        name,
        type,
        description,
        unit: extra?.unit,
        weights: extra?.weights ? { create: extra.weights } : undefined,
        measurements: extra?.measurements ? { create: extra.measurements } : undefined,
      },
    });

  const halfAndHalf = await rule('Meio a meio', RuleType.EQUAL, 'Divide igualmente entre quem participa.');
  const byIncome = await rule('Proporcional à renda', RuleType.INCOME, 'Cada um paga na proporção da sua entrada recorrente.');
  await rule('Proporcional à sobra livre', RuleType.SURPLUS, 'Proporção da renda recorrente menos os gastos fixos individuais.');
  const housing = await rule('Moradia 60/40', RuleType.FIXED, 'Percentuais combinados uma vez.', {
    weights: [
      { userId: vinicius.id, percent: 60 },
      { userId: camila.id, percent: 40 },
      { userId: rafael.id, percent: 0 },
    ],
  });
  const perKm = await rule(
    'Carro por km rodado',
    RuleType.METER,
    'Todo mês cada um lança quanto rodou; o sistema converte em percentual.',
    {
      unit: 'km',
      measurements: [
        { userId: vinicius.id, month: '2026-09', amount: 320 },
        { userId: camila.id, month: '2026-09', amount: 780 },
        { userId: vinicius.id, month: '2026-08', amount: 410 },
        { userId: camila.id, month: '2026-08', amount: 690 },
      ],
    },
  );

  await prisma.income.createMany({
    data: [
      { userId: vinicius.id, type: IncomeType.RECURRING, description: 'Salário', amount: 6200, dayOfMonth: 5 },
      { userId: vinicius.id, type: IncomeType.ONE_OFF, description: 'Freela de projeto', amount: 1400, date: new Date('2026-09-18T00:00:00Z') },
      { userId: camila.id, type: IncomeType.RECURRING, description: 'Salário', amount: 4100, dayOfMonth: 5 },
      { userId: camila.id, type: IncomeType.RECURRING, description: 'Aulas particulares', amount: 700, dayOfMonth: 20 },
      { userId: rafael.id, type: IncomeType.RECURRING, description: 'Salário', amount: 3300, dayOfMonth: 1 },
      { userId: rafael.id, type: IncomeType.ONE_OFF, description: 'Venda de bicicleta', amount: 850, date: new Date('2026-09-09T00:00:00Z') },
    ],
  });

  const everyone = [vinicius.id, camila.id, rafael.id];
  const couple = [vinicius.id, camila.id];

  const expense = (
    userId: string, day: string, paymentMethod: string, category: string,
    expenseType: ExpenseType, description: string, amount: number,
    participants: string[] = [], ruleId: string | null = null,
  ) =>
    prisma.expense.create({
      data: {
        userId, familyId: family.id,
        date: new Date(`${day}T00:00:00Z`), month: day.slice(0, 7),
        paymentMethod, category, expenseType, description, amount,
        shared: participants.length > 0, ruleId,
        shares: { create: participants.map((id) => ({ userId: id })) },
      },
    });

  const F = ExpenseType.FIXED;
  const O = ExpenseType.OPTIONAL;
  await expense(vinicius.id, '2026-09-02', 'Pix', 'home', F, 'Aluguel', 2400, everyone, byIncome.id);
  await expense(vinicius.id, '2026-09-03', 'Débito', 'home', F, 'Energia elétrica', 285, everyone, halfAndHalf.id);
  await expense(camila.id, '2026-09-04', 'Pix', 'home', F, 'Internet', 129.9, everyone, halfAndHalf.id);
  await expense(camila.id, '2026-09-06', 'Crédito', 'food', F, 'Mercado do mês', 940, everyone, halfAndHalf.id);
  await expense(vinicius.id, '2026-09-07', 'Crédito', 'car', F, 'Parcela do carro', 890, couple, housing.id);
  await expense(camila.id, '2026-09-08', 'Débito', 'car', F, 'Combustível', 320, couple, perKm.id);
  await expense(vinicius.id, '2026-09-09', 'Crédito', 'subscriptions', O, 'Streaming de filmes', 55.9, everyone, halfAndHalf.id);
  await expense(rafael.id, '2026-09-10', 'Pix', 'pets', F, 'Ração e areia', 210, everyone, halfAndHalf.id);
  await expense(vinicius.id, '2026-09-12', 'Crédito', 'games', O, 'Jogo novo', 249);
  await expense(camila.id, '2026-09-13', 'Débito', 'outing', O, 'Jantar de aniversário', 310, couple, halfAndHalf.id);
  await expense(rafael.id, '2026-09-14', 'Dinheiro', 'food', O, 'Feira', 87.5);
  await expense(vinicius.id, '2026-09-15', 'Crédito', 'subscriptions', F, 'Academia', 129);
  await expense(camila.id, '2026-09-17', 'Crédito', 'home', O, 'Cortina da sala', 430, couple, housing.id);
  await expense(rafael.id, '2026-09-19', 'Pix', 'outing', O, 'Cinema', 76);
  await expense(vinicius.id, '2026-09-21', 'Débito', 'car', O, 'Lavagem do carro', 90, couple, perKm.id);
  await expense(camila.id, '2026-09-22', 'Pix', 'pets', O, 'Banho e tosa', 130, everyone, halfAndHalf.id);

  const total = await prisma.expense.count();
  console.log(`Seed pronto: família "${family.name}" (${family.inviteCode}), 3 membros, ${total} gastos em ${MONTH}.`);
  console.log('Entre com teste1@email.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
