import { setDefaultResultOrder } from 'node:dns';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ErrorLoggingFilter } from './common/filters/error-logging.filter';
import { ErrorsService } from './modules/errors/errors.service';

// Render's containers have no IPv6 route; Node's default DNS order can still
// hand back an AAAA record, which fails outbound connections (e.g. Gmail
// SMTP) with ENETUNREACH. Preferring IPv4 avoids that everywhere, not just
// for mail.
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Authenticated by default: a new route is born protected and only leaves
  // that state with an explicit @Public().
  app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));

  // Order matters: NestJS hands an exception to the first filter whose
  // @Catch() matches, so the Prisma-specific filter must come before the
  // catch-all or it would never see a Prisma error.
  const httpAdapter = app.get(HttpAdapterHost).httpAdapter;
  const errors = app.get(ErrorsService);
  app.useGlobalFilters(
    new PrismaExceptionFilter(httpAdapter, errors),
    new ErrorLoggingFilter(httpAdapter, errors),
  );

  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
void bootstrap();
