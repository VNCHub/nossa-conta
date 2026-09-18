import { Module } from '@nestjs/common';
import { MAIL_SENDER } from './mail-sender.interface';
import { GmailMailService } from './gmail-mail.service';

/**
 * Only line to touch when switching provider (e.g. to SendGrid once a domain
 * is verified): change useClass here to the new implementation of MailSender.
 */
@Module({
  providers: [{ provide: MAIL_SENDER, useClass: GmailMailService }],
  exports: [MAIL_SENDER],
})
export class MailModule {}
