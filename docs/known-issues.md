# Known issues

## Gmail SMTP não entrega e-mail em produção (Render)

O envio de e-mail de redefinição de senha (`backend/src/modules/mail/gmail-mail.service.ts`)
usa Gmail SMTP e **não funciona em produção**: o Render bloqueia ou derruba silenciosamente
conexão SMTP de saída no plano gratuito.

Confirmado em produção, em duas etapas:

1. Primeira falha: `connect ENETUNREACH` para um endereço IPv6 do Gmail — o container do
   Render não tem rota IPv6, mas a resolução de DNS ainda devolvia um registro AAAA.
2. Depois de forçar IPv4 (`dns.setDefaultResultOrder('ipv4first')` em `backend/src/main.ts`),
   a conexão passou a falhar com `Connection timeout` — sem recusa ativa, sem resposta. Isso
   descarta IPv6/DNS como causa e aponta pra bloqueio de porta de saída do próprio Render.

**Efeito prático:** `POST /auth/esqueci-senha` responde normalmente (a mensagem genérica não
muda, por segurança), mas o e-mail nunca chega. A troca de senha por quem já está logado
(`PATCH /auth/perfil`, tela "Meu perfil") não é afetada — não depende de e-mail.

**Correção:** trocar o provedor de `GmailMailService` (SMTP) para um baseado em API HTTP, que
não passa pela porta bloqueada — SendGrid com Single Sender Verification evita precisar de
domínio próprio, igual o Gmail. A interface `MailSender`
(`backend/src/modules/mail/mail-sender.interface.ts`) já foi desenhada pra essa troca:
implementar `SendgridMailService` e mudar o `useClass` em `mail.module.ts`, nada mais muda.
