import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { MailSender } from './mail-sender.interface';

/**
 * Sends through the sender's own Gmail account (SMTP + App Password) — no
 * domain to verify, unlike Resend/SendGrid without a verified sender. Trade-off:
 * mail shows up "from" a personal Gmail address and Gmail's sending limits
 * (~500/day) apply, both fine for a family-sized app.
 */
@Injectable()
export class GmailMailService implements MailSender, OnModuleInit {
  private readonly logger = new Logger(GmailMailService.name);
  private transport: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const user = this.config.get<string>('GMAIL_USER');
    const pass = this.config.get<string>('GMAIL_APP_PASSWORD');
    if (!user || !pass) {
      this.logger.warn(
        'GMAIL_USER/GMAIL_APP_PASSWORD não configurados — e-mails de redefinição de senha não serão enviados.',
      );
      return;
    }
    this.transport = createTransport({ service: 'gmail', auth: { user, pass } });
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
    if (!this.transport) {
      this.logger.error(`Não foi possível enviar e-mail de redefinição para ${to}: transporte não configurado.`);
      return;
    }
    await this.transport.sendMail({
      from: `Nossa Conta <${this.config.get<string>('GMAIL_USER')}>`,
      to,
      subject: 'Redefinir sua senha — Nossa Conta',
      html: `
        <p>Oi, ${name}.</p>
        <p>Alguém (esperamos que você) pediu pra redefinir a senha da sua conta no Nossa Conta.</p>
        <p><a href="${resetUrl}">Clique aqui pra escolher uma nova senha</a>. O link expira em 1 hora.</p>
        <p>Se não foi você, pode ignorar este e-mail — sua senha continua a mesma.</p>
      `,
    });
  }
}
