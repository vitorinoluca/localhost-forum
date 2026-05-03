import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env.js';

const smtpTransporter =
  env.SMTP_HOST && env.SMTP_PORT
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              }
            : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });

function verificationMailParts(code: string) {
  const subject = 'Tu código de verificación';
  const text = `Tu código de verificación es ${code}. Vence en 15 minutos.`;
  const html = `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <h1 style="font-size: 20px;">Verifica tu cuenta</h1>
        <p>Usa este código para completar tu registro:</p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: 700;">${code}</p>
        <p>Este código vence en 15 minutos. Si no solicitaste esta cuenta, ignora este correo.</p>
      </div>
    `;
  return { subject, text, html };
}

export async function sendVerificationEmail(email: string, code: string) {
  const { subject, text, html } = verificationMailParts(code);

  if (env.RESEND_API_KEY) {
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: env.MAIL_FROM,
      to: email,
      subject,
      html,
      text,
    });
    if (error) {
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : JSON.stringify(error);
      throw new Error(msg || 'Resend: error al enviar el correo.');
    }
    return;
  }

  await smtpTransporter.sendMail({
    from: env.MAIL_FROM,
    to: email,
    subject,
    text,
    html,
  });

  if (
    !env.SMTP_HOST &&
    env.NODE_ENV !== 'production' &&
    env.AUTH_LOG_DEV_CODE
  ) {
    console.log(`Código de verificación para ${email}: ${code}`);
  }
}
