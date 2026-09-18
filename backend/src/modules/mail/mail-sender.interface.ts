export const MAIL_SENDER = Symbol('MAIL_SENDER');

/**
 * Transactional e-mail, kept to exactly what the app sends. Swapping provider
 * means writing one class that implements this and changing the binding in
 * mail.module.ts — nothing else moves.
 */
export interface MailSender {
  sendPasswordReset(params: { to: string; name: string; resetUrl: string }): Promise<void>;
}
