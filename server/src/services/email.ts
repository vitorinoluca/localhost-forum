import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter =
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

export async function sendVerificationEmail(email: string, code: string) {
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: email,
    subject: 'Tu código de verificación',
    text: `Tu código de verificación es ${code}. Vence en 15 minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <h1 style="font-size: 20px;">Verifica tu cuenta</h1>
        <p>Usa este código para completar tu registro:</p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: 700;">${code}</p>
        <p>Este código vence en 15 minutos. Si no solicitaste esta cuenta, ignora este correo.</p>
      </div>
    `,
  });

  if (
    !env.SMTP_HOST &&
    env.NODE_ENV !== 'production' &&
    env.AUTH_LOG_DEV_CODE
  ) {
    console.log(`Código de verificación para ${email}: ${code}`);
  }
}
