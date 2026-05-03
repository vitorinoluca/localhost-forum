import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

function parseEnvBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase().trim();
  if (['true', '1', 'yes', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'off'].includes(s)) return false;
  return fallback;
}

function parseOptionalEnvBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase().trim();
  if (['true', '1', 'yes', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'off'].includes(s)) return false;
  return undefined;
}

const rawEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(4000),
  LISTEN_HOST: z.string().optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(32).default(1),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5174'),
  CLIENT_ORIGIN_REGEX: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().default('my_app_session'),
  SESSION_COOKIE_SAME_SITE: z.enum(['lax', 'none']).optional(),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(1).default('onboarding@resend.dev'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1),
  SUPERADMIN_EMAILS: z.string().optional(),
  CLIENT_DIST_PATH: z.string().optional(),
});

function parseGoogleClientId(): string | undefined {
  const value = process.env.GOOGLE_CLIENT_ID?.trim();
  return value && value.length > 0 ? value : undefined;
}

const raw = rawEnvSchema.parse(process.env);

export const env = {
  ...raw,
  RESEND_API_KEY: raw.RESEND_API_KEY?.trim() || undefined,
  AUTH_LOGIN_LOG: parseEnvBoolean(process.env.AUTH_LOGIN_LOG, true),
  DATABASE_SSL: parseEnvBoolean(process.env.DATABASE_SSL, false),
  DATABASE_SSL_REJECT_UNAUTHORIZED: parseOptionalEnvBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED),
  AUTH_RETURN_DEV_CODE: parseEnvBoolean(process.env.AUTH_RETURN_DEV_CODE, false),
  AUTH_LOG_DEV_CODE: parseEnvBoolean(process.env.AUTH_LOG_DEV_CODE, false),
  GOOGLE_CLIENT_ID: parseGoogleClientId(),
};
