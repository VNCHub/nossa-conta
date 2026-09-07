import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const TENTATIVAS = 8;
const ESPERA_MS = 1500;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Conecta com repetição em vez de morrer na primeira falha.
   *
   * Não é paranoia: o Postgres do compose pode aceitar o healthcheck e ainda
   * recusar conexão por um instante, e o plano gratuito do Neon suspende bancos
   * ociosos — a primeira conexão depois de um tempo parado falha e só a segunda
   * pega. Sem isso, o serviço cai e não volta sozinho.
   */
  async onModuleInit() {
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      try {
        await this.$connect();
        if (tentativa > 1) this.logger.log(`Banco conectado na tentativa ${tentativa}.`);
        return;
      } catch (erro) {
        if (tentativa === TENTATIVAS) throw erro;
        this.logger.warn(
          `Banco indisponível (tentativa ${tentativa}/${TENTATIVAS}). Nova tentativa em ${ESPERA_MS}ms.`,
        );
        await new Promise((r) => setTimeout(r, ESPERA_MS));
      }
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
