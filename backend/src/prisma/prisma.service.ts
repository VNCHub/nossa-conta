import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const ATTEMPTS = 8;
const WAIT_MS = 1500;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Connects with retries instead of dying on the first failure.
   *
   * Not paranoia: the compose Postgres can pass the healthcheck and still refuse
   * a connection for a moment, and Neon's free plan suspends idle databases —
   * the first connection after a while idle fails and only the second one takes.
   * Without this, the service goes down and does not come back on its own.
   */
  async onModuleInit() {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        await this.$connect();
        if (attempt > 1) this.logger.log(`Database connected on attempt ${attempt}.`);
        return;
      } catch (err) {
        if (attempt === ATTEMPTS) throw err;
        this.logger.warn(
          `Database unavailable (attempt ${attempt}/${ATTEMPTS}). Retrying in ${WAIT_MS}ms.`,
        );
        await new Promise((r) => setTimeout(r, WAIT_MS));
      }
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
