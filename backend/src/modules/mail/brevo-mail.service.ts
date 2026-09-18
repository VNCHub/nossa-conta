import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MailSender } from './mail-sender.interface';

/**
 * Sends through Brevo's HTTPS API instead of SMTP — Render's free tier
 * blocks/drops outbound SMTP (confirmed via ENETUNREACH then a silent
 * connection timeout in production), but regular HTTPS egress works. A
 * verified single sender avoids needing a verified domain. No SDK: one
 * endpoint, one call, plain fetch (Node 24 has it built in).
 */
@Injectable()
export class BrevoMailService implements MailSender, OnModuleInit {
  private static readonly API_URL = 'https://api.brevo.com/v3/smtp/email';
  private readonly logger = new Logger(BrevoMailService.name);
  private apiKey: string | null = null;
  private from: string | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const from = this.config.get<string>('BREVO_FROM_EMAIL');
    if (!apiKey || !from) {
      this.logger.warn(
        'BREVO_API_KEY/BREVO_FROM_EMAIL não configurados — e-mails de redefinição de senha não serão enviados.',
      );
      return;
    }
    this.apiKey = apiKey;
    this.from = from;
  }

  async sendPasswordReset({
    to,
    name,
    resetUrl,
  }: {
    to: string;
    name: string;
    resetUrl: string;
  }): Promise<void> {
    if (!this.apiKey || !this.from) {
      this.logger.error(`Não foi possível enviar e-mail de redefinição para ${to}: remetente não configurado.`);
      return;
    }
    const res = await fetch(BrevoMailService.API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        sender: { name: 'Nossa Conta', email: this.from },
        to: [{ email: to, name }],
        subject: 'Redefinir sua senha — Nossa Conta',
        htmlContent: `
          <p>Oi, ${name}.</p>
          <p>Alguém (esperamos que você) pediu pra redefinir a senha da sua conta no Nossa Conta.</p>
          <p><a href="${resetUrl}">Clique aqui pra escolher uma nova senha</a>. O link expira em 1 hora.</p>
          <p>Se não foi você, pode ignorar este e-mail — sua senha continua a mesma.</p>
        `,
      }),
    }).catch((err: Error) => {
      // Logged and re-thrown: AuthService swallows this so the HTTP response
      // never reveals delivery failures (would leak which e-mails exist),
      // but it must show up somewhere or a broken mail path is invisible.
      this.logger.error(`Falha ao enviar e-mail de redefinição para ${to}: ${err.message}`);
      throw err;
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Falha ao enviar e-mail de redefinição para ${to}: ${res.status} ${body}`);
      throw new Error(`Brevo respondeu ${res.status}`);
    }
  }
}
