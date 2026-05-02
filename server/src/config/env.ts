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

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z.preprocess((v) => parseEnvBoolean(v, false), z.boolean()),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.preprocess(
    (v) => parseOptionalEnvBoolean(v),
    z.boolean().optional(),
  ),
  PORT: z.coerce.number().int().positive().default(4000),
  LISTEN_HOST: z.string().optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(32).default(1),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5174'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().default('my_app_session'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().email().default('no-reply@my-app.local'),
  AUTH_RETURN_DEV_CODE: z.preprocess((v) => parseEnvBoolean(v, false), z.boolean()),
  AUTH_LOG_DEV_CODE: z.preprocess((v) => parseEnvBoolean(v, false), z.boolean()),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.preprocess((val) => {
    if (typeof val !== 'string') return undefined;
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  }, z.string().min(1).optional()),
  SUPERADMIN_EMAILS: z.string().optional(),
});

export const env = envSchema.parse(process.env);
