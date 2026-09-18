import { Module } from '@nestjs/common';
import { MAIL_SENDER } from './mail-sender.interface';
import { BrevoMailService } from './brevo-mail.service';

/**
 * Only line to touch when switching provider: change useClass here to the
 * new implementation of MailSender.
 */
@Module({
  providers: [{ provide: MAIL_SENDER, useClass: BrevoMailService }],
  exports: [MAIL_SENDER],
})
export class MailModule {}
