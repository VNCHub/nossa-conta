import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import type { MailSender } from './mail-sender.interface';

/**
 * Sends through SendGrid's HTTPS API instead of SMTP — Render's free tier
 * blocks/drops outbound SMTP (confirmed via ENETUNREACH then a silent
 * connection timeout in production), but regular HTTPS egress works. Single
 * Sender Verification avoids needing a verified domain.
 */
@Injectable()
export class SendgridMailService implements MailSender, OnModuleInit {
  private readonly logger = new Logger(SendgridMailService.name);
  private from: string | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    const from = this.config.get<string>('SENDGRID_FROM_EMAIL');
    if (!apiKey || !from) {
      this.logger.warn(
        'SENDGRID_API_KEY/SENDGRID_FROM_EMAIL não configurados — e-mails de redefinição de senha não serão enviados.',
      );
      return;
    }
    sgMail.setApiKey(apiKey);
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
    if (!this.from) {
      this.logger.error(`Não foi possível enviar e-mail de redefinição para ${to}: remetente não configurado.`);
      return;
    }
    try {
      await sgMail.send({
        to,
        from: { email: this.from, name: 'Nossa Conta' },
        subject: 'Redefinir sua senha — Nossa Conta',
        html: `
          <p>Oi, ${name}.</p>
          <p>Alguém (esperamos que você) pediu pra redefinir a senha da sua conta no Nossa Conta.</p>
          <p><a href="${resetUrl}">Clique aqui pra escolher uma nova senha</a>. O link expira em 1 hora.</p>
          <p>Se não foi você, pode ignorar este e-mail — sua senha continua a mesma.</p>
        `,
      });
    } catch (err) {
      // Logged and re-thrown: AuthService swallows this so the HTTP response
      // never reveals delivery failures (would leak which e-mails exist),
      // but it must show up somewhere or a broken mail path is invisible.
      this.logger.error(`Falha ao enviar e-mail de redefinição para ${to}: ${(err as Error).message}`);
      throw err;
    }
  }
}
