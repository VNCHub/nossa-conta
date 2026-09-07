/**
 * Requisito 7: os dados de uma família são invisíveis para quem está fora dela.
 * Monta duas famílias reais e tenta atravessar a fronteira por todos os caminhos.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';

const MES = '2031-03';

interface Conta {
  token: string;
  userId: string;
  gastoId: string;
  regraId: string;
  entradaId: string;
}

describe('Isolamento entre famílias (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => request.SuperTest<request.Test>;
  const emails: string[] = [];

  let casaA: Conta;
  let casaB: Conta;

  const criarConta = async (marca: string, nomeFamilia: string): Promise<Conta> => {
    const email = `e2e-${marca}-${Date.now()}@teste.local`;
    emails.push(email);

    const { body: sessao } = await http()
      .post('/auth/register')
      .send({ nome: `Teste ${marca}`, email, senha: 'senha123', nomeFamilia })
      .expect(201);
    const token = sessao.accessToken;

    const { body: regras } = await http()
      .get('/regras')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { body: entrada } = await http()
      .post('/entradas')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'recorrente', descricao: 'Salário', valor: 5000, diaDoMes: 5 })
      .expect(201);

    const { body: gasto } = await http()
      .post('/gastos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        data: `${MES}-10`, pagamento: 'Pix', categoria: 'casa', tipoGasto: 'fixo',
        descricao: `Aluguel ${marca}`, valor: 1000, dividir: false,
      })
      .expect(201);

    return {
      token,
      userId: sessao.user.id,
      gastoId: gasto.id,
      regraId: regras[0].id,
      entradaId: entrada.id,
    };
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));
    await app.init();

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer()) as unknown as request.SuperTest<request.Test>;

    casaA = await criarConta('a', 'Casa A');
    casaB = await criarConta('b', 'Casa B');
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: emails } } });
    const familias = [...new Set(users.map((u) => u.familiaId).filter(Boolean))] as string[];
    await prisma.user.updateMany({
      where: { id: { in: users.map((u) => u.id) } },
      data: { familiaId: null },
    });
    await prisma.familia.deleteMany({ where: { id: { in: familias } } });
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    await app.close();
  });

  const comoB = (r: request.Test) => r.set('Authorization', `Bearer ${casaB.token}`);

  it('a listagem de gastos traz só os da própria família', async () => {
    const { body } = await comoB(http().get(`/gastos?mes=${MES}`)).expect(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(casaB.gastoId);
    expect(body.map((g: { id: string }) => g.id)).not.toContain(casaA.gastoId);
  });

  it('o consolidado não enxerga membros nem valores da outra família', async () => {
    const { body } = await comoB(
      http().get(`/relatorios/consolidado?mes=${MES}`),
    ).expect(200);
    expect(Object.keys(body.porUsuario)).toEqual([casaB.userId]);
    expect(body.totalMes).toBe(1000);
  });

  it('a lista de membros não vaza usuários de fora', async () => {
    const { body } = await comoB(http().get('/familias/minha/membros')).expect(200);
    expect(body.map((m: { id: string }) => m.id)).toEqual([casaB.userId]);
  });

  it('editar gasto alheio responde 404, sem confirmar que ele existe', () =>
    comoB(http().patch(`/gastos/${casaA.gastoId}`))
      .send({
        data: `${MES}-10`, pagamento: 'Pix', categoria: 'casa', tipoGasto: 'fixo',
        descricao: 'invadido', valor: 1, dividir: false,
      })
      .expect(404));

  it('apagar gasto alheio responde 404', () =>
    comoB(http().delete(`/gastos/${casaA.gastoId}`)).expect(404));

  it('apagar entrada alheia responde 404', () =>
    comoB(http().delete(`/entradas/${casaA.entradaId}`)).expect(404));

  it('mexer na regra de rateio alheia responde 404', () =>
    comoB(http().put(`/regras/${casaA.regraId}/pesos`))
      .send({ pesos: [{ userId: casaB.userId, percentual: 100 }] })
      .expect(404));

  it('não dá para apontar um gasto para a regra de outra família', () =>
    comoB(http().post('/gastos'))
      .send({
        data: `${MES}-11`, pagamento: 'Pix', categoria: 'casa', tipoGasto: 'fixo',
        descricao: 'regra de fora', valor: 100, dividir: true,
        participantes: [casaB.userId], regraId: casaA.regraId,
      })
      .expect(400));

  it('não dá para empurrar cota para quem não é da família', () =>
    comoB(http().post('/gastos'))
      .send({
        data: `${MES}-11`, pagamento: 'Pix', categoria: 'casa', tipoGasto: 'fixo',
        descricao: 'participante de fora', valor: 100, dividir: true,
        participantes: [casaB.userId, casaA.userId], regraId: casaB.regraId,
      })
      .expect(400));

  it('sem token, nada responde', async () => {
    await http().get(`/gastos?mes=${MES}`).expect(401);
    await http().get(`/relatorios/consolidado?mes=${MES}`).expect(401);
    await http().get('/familias/minha').expect(401);
  });
});
