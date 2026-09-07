import { Controller, Get } from '@nestjs/common';
import { Publico } from './common/decorators/publico.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Publico()
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', banco: 'conectado', em: new Date().toISOString() };
  }
}
