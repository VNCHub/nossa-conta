import { Module } from '@nestjs/common';
import { MAIL_SENDER } from './mail-sender.interface';
import { SendgridMailService } from './sendgrid-mail.service';

/**
 * Only line to touch when switching provider: change useClass here to the
 * new implementation of MailSender.
 */
@Module({
  providers: [{ provide: MAIL_SENDER, useClass: SendgridMailService }],
  exports: [MAIL_SENDER],
})
export class MailModule {}
