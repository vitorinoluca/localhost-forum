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

function parseMailFrom(from: string): { name: string; email: string } {
  const trimmed = from.trim();
  const bracket = trimmed.match(/^(.+?)\s*<([^<>]+)>$/);
  if (bracket) {
    const name = (bracket[1] ?? '').trim().replace(/^["']|["']$/g, '');
    const email = (bracket[2] ?? '').trim();
    return { name: name || 'Foro', email };
  }
  return { name: 'Foro', email: trimmed };
}

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

function brevoErrorMessage(raw: string): string {
  try {
    const j = JSON.parse(raw) as { message?: string };
    if (j.message) return j.message;
  } catch {
    void 0;
  }
  return raw;
}

async function sendViaBrevo(to: string, subject: string, html: string, text: string) {
  const sender = parseMailFrom(env.MAIL_FROM);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: { name: sender.name, email: sender.email },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const raw = await res.text();
    const msg = brevoErrorMessage(raw);
    throw new Error(msg || `Brevo HTTP ${res.status}`);
  }
}

export async function sendVerificationEmail(email: string, code: string) {
  const { subject, text, html } = verificationMailParts(code);

  if (env.BREVO_API_KEY) {
    await sendViaBrevo(email, subject, html, text);
    return;
  }

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
