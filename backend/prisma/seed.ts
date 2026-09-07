/**
 * Popula o banco com os dados de demonstração do protótipo (docs/prototipo.jsx),
 * para que o painel da família reproduza exatamente os números de setembro/2026.
 * Senha de todos: 123456.
 */
import { PrismaClient, TipoEntrada, TipoGasto, TipoRegra } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const MES = '2026-09';

async function main() {
  // Recomeça do zero: o seed é para desenvolvimento, não para produção.
  await prisma.gastoParticipante.deleteMany();
  await prisma.regraMedicao.deleteMany();
  await prisma.regraPeso.deleteMany();
  await prisma.gasto.deleteMany();
  await prisma.entrada.deleteMany();
  await prisma.regraRateio.deleteMany();
  await prisma.user.updateMany({ data: { familiaId: null } });
  await prisma.familia.deleteMany();
  await prisma.user.deleteMany();

  const senhaHash = await argon2.hash('123456');
  const [vinicius, camila, rafael] = await Promise.all([
    prisma.user.create({
      data: { nome: 'Vinicius', email: 'vinicius@email.com', senhaHash, cor: '#1F5F52' },
    }),
    prisma.user.create({
      data: { nome: 'Camila', email: 'camila@email.com', senhaHash, cor: '#B8452F' },
    }),
    prisma.user.create({
      data: { nome: 'Rafael', email: 'rafael@email.com', senhaHash, cor: '#7A5AA6' },
    }),
  ]);

  const familia = await prisma.familia.create({
    data: {
      nome: 'Casa da Vila Nova',
      codigoConvite: 'VILA-7K2M',
      criadaPorId: vinicius.id,
      membros: { connect: [{ id: vinicius.id }, { id: camila.id }, { id: rafael.id }] },
    },
  });

  const regra = async (
    nome: string,
    tipo: TipoRegra,
    descricao: string,
    extra?: {
      unidade?: string;
      pesos?: { userId: string; percentual: number }[];
      medicoes?: { userId: string; mes: string; valor: number }[];
    },
  ) =>
    prisma.regraRateio.create({
      data: {
        familiaId: familia.id,
        nome,
        tipo,
        descricao,
        unidade: extra?.unidade,
        pesos: extra?.pesos ? { create: extra.pesos } : undefined,
        medicoes: extra?.medicoes ? { create: extra.medicoes } : undefined,
      },
    });

  const meioAMeio = await regra('Meio a meio', TipoRegra.IGUAL, 'Divide igualmente entre quem participa.');
  const porRenda = await regra('Proporcional à renda', TipoRegra.RENDA, 'Cada um paga na proporção da sua entrada recorrente.');
  await regra('Proporcional à sobra livre', TipoRegra.SOBRA, 'Proporção da renda recorrente menos os gastos fixos individuais.');
  const moradia = await regra('Moradia 60/40', TipoRegra.FIXO, 'Percentuais combinados uma vez.', {
    pesos: [
      { userId: vinicius.id, percentual: 60 },
      { userId: camila.id, percentual: 40 },
      { userId: rafael.id, percentual: 0 },
    ],
  });
  const porKm = await regra(
    'Carro por km rodado',
    TipoRegra.MEDIDOR,
    'Todo mês cada um lança quanto rodou; o sistema converte em percentual.',
    {
      unidade: 'km',
      medicoes: [
        { userId: vinicius.id, mes: '2026-09', valor: 320 },
        { userId: camila.id, mes: '2026-09', valor: 780 },
        { userId: vinicius.id, mes: '2026-08', valor: 410 },
        { userId: camila.id, mes: '2026-08', valor: 690 },
      ],
    },
  );

  await prisma.entrada.createMany({
    data: [
      { userId: vinicius.id, tipo: TipoEntrada.RECORRENTE, descricao: 'Salário', valor: 6200, diaDoMes: 5 },
      { userId: vinicius.id, tipo: TipoEntrada.PONTUAL, descricao: 'Freela de projeto', valor: 1400, data: new Date('2026-09-18T00:00:00Z') },
      { userId: camila.id, tipo: TipoEntrada.RECORRENTE, descricao: 'Salário', valor: 4100, diaDoMes: 5 },
      { userId: camila.id, tipo: TipoEntrada.RECORRENTE, descricao: 'Aulas particulares', valor: 700, diaDoMes: 20 },
      { userId: rafael.id, tipo: TipoEntrada.RECORRENTE, descricao: 'Salário', valor: 3300, diaDoMes: 1 },
      { userId: rafael.id, tipo: TipoEntrada.PONTUAL, descricao: 'Venda de bicicleta', valor: 850, data: new Date('2026-09-09T00:00:00Z') },
    ],
  });

  const todos = [vinicius.id, camila.id, rafael.id];
  const casal = [vinicius.id, camila.id];

  const gasto = (
    userId: string, dia: string, pagamento: string, categoria: string,
    tipoGasto: TipoGasto, descricao: string, valor: number,
    participantes: string[] = [], regraId: string | null = null,
  ) =>
    prisma.gasto.create({
      data: {
        userId, familiaId: familia.id,
        data: new Date(`${dia}T00:00:00Z`), mes: dia.slice(0, 7),
        pagamento, categoria, tipoGasto, descricao, valor,
        dividir: participantes.length > 0, regraId,
        participantes: { create: participantes.map((id) => ({ userId: id })) },
      },
    });

  const F = TipoGasto.FIXO;
  const O = TipoGasto.OPCIONAL;
  await gasto(vinicius.id, '2026-09-02', 'Pix', 'casa', F, 'Aluguel', 2400, todos, porRenda.id);
  await gasto(vinicius.id, '2026-09-03', 'Débito', 'casa', F, 'Energia elétrica', 285, todos, meioAMeio.id);
  await gasto(camila.id, '2026-09-04', 'Pix', 'casa', F, 'Internet', 129.9, todos, meioAMeio.id);
  await gasto(camila.id, '2026-09-06', 'Crédito', 'comida', F, 'Mercado do mês', 940, todos, meioAMeio.id);
  await gasto(vinicius.id, '2026-09-07', 'Crédito', 'carro', F, 'Parcela do carro', 890, casal, moradia.id);
  await gasto(camila.id, '2026-09-08', 'Débito', 'carro', F, 'Combustível', 320, casal, porKm.id);
  await gasto(vinicius.id, '2026-09-09', 'Crédito', 'assinaturas', O, 'Streaming de filmes', 55.9, todos, meioAMeio.id);
  await gasto(rafael.id, '2026-09-10', 'Pix', 'pets', F, 'Ração e areia', 210, todos, meioAMeio.id);
  await gasto(vinicius.id, '2026-09-12', 'Crédito', 'jogos', O, 'Jogo novo', 249);
  await gasto(camila.id, '2026-09-13', 'Débito', 'passeio', O, 'Jantar de aniversário', 310, casal, meioAMeio.id);
  await gasto(rafael.id, '2026-09-14', 'Dinheiro', 'comida', O, 'Feira', 87.5);
  await gasto(vinicius.id, '2026-09-15', 'Crédito', 'assinaturas', F, 'Academia', 129);
  await gasto(camila.id, '2026-09-17', 'Crédito', 'casa', O, 'Cortina da sala', 430, casal, moradia.id);
  await gasto(rafael.id, '2026-09-19', 'Pix', 'passeio', O, 'Cinema', 76);
  await gasto(vinicius.id, '2026-09-21', 'Débito', 'carro', O, 'Lavagem do carro', 90, casal, porKm.id);
  await gasto(camila.id, '2026-09-22', 'Pix', 'pets', O, 'Banho e tosa', 130, todos, meioAMeio.id);

  const total = await prisma.gasto.count();
  console.log(`Seed pronto: família "${familia.nome}" (${familia.codigoConvite}), 3 membros, ${total} gastos em ${MES}.`);
  console.log('Entre com vinicius@email.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
