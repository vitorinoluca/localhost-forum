import type { Response } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { sendVerificationEmail } from '../services/email.js';
import { upsertUserFromGoogle, verifyGoogleIdToken } from '../services/google-oauth.js';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../services/password.js';
import { clearSessionCookie, createSession } from '../services/session.js';
import { createVerificationCode, hashSecret, safeEqualHash } from '../services/tokens.js';
import { toPublicUser } from '../services/public-user.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const authRouter = Router();
const pendingRegistrationCookie = 'my_app_registration';
const pendingRegistrationMaxAgeMs = 1000 * 60 * 30;
const verificationMinutes = 15;
const verificationResendCooldownSeconds = 60;
const maxLoginAttempts = 5;
const lockMinutes = 15;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Minimo 2 caracteres.')
    .max(80, 'El nombre es demasiado largo.'),
  email: z
    .string()
    .trim()
    .email('Email invalido.')
    .max(254)
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1, 'La contrasena no puede estar vacia.'),
});

type RegisterFieldKey = 'name' | 'email' | 'password';

function zodIssuesToRegisterFields(issues: z.core.$ZodIssue[]): Partial<
  Record<RegisterFieldKey, string[]>
> {
  const fields: Partial<Record<RegisterFieldKey, string[]>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key !== 'name' && key !== 'email' && key !== 'password') continue;
    const k = key as RegisterFieldKey;
    const list = fields[k] ?? [];
    list.push(issue.message);
    fields[k] = list;
  }
  return fields;
}

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

const verificationSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

const googleCredentialSchema = z.object({
  credential: z.string().min(1),
});

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  google_sub: string | null;
  email_verified_at: Date | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  created_at: Date;
  bio: string | null;
  avatar_url: string | null;
  role: string | null;
  banned_at: Date | null;
};

function maskEmail(email: string) {
  const [localPart = '', domain = ''] = email.split('@');
  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal}${'*'.repeat(Math.max(localPart.length - 2, 3))}@${domain}`;
}

function createPendingRegistrationValue(userId: string) {
  return `${userId}.${hashSecret(userId)}`;
}

function readPendingRegistrationUserId(request: AuthenticatedRequest) {
  const value = request.cookies?.[pendingRegistrationCookie];

  if (typeof value !== 'string') {
    return null;
  }

  const [userId, signature] = value.split('.');

  if (!userId || !signature || !safeEqualHash(hashSecret(userId), signature)) {
    return null;
  }

  return userId;
}

function setPendingRegistrationCookie(response: Response, userId: string) {
  response.cookie(pendingRegistrationCookie, createPendingRegistrationValue(userId), {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: pendingRegistrationMaxAgeMs,
    path: '/',
  });
}

function clearPendingRegistrationCookie(response: Response) {
  response.clearCookie(pendingRegistrationCookie, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

async function getPendingRegistrationUser(request: AuthenticatedRequest) {
  const userId = readPendingRegistrationUserId(request);

  if (!userId) {
    return null;
  }

  const result = await pool.query<UserRow>(
    'select * from users where id = $1 and email_verified_at is null limit 1',
    [userId],
  );

  return result.rows[0] ?? null;
}

async function createAndSendVerificationCode(userId: string, email: string, force = false) {
  if (!force) {
    const recentCode = await pool.query<{ id: string }>(
      `
        select id
        from email_verification_codes
        where user_id = $1
          and consumed_at is null
          and expires_at > now()
          and created_at > now() - ($2 || ' seconds')::interval
        limit 1
      `,
      [userId, verificationResendCooldownSeconds],
    );

    if (recentCode.rows[0]) {
      return { sent: false, devCode: undefined };
    }
  }

  const code = createVerificationCode();

  await pool.query(
    `
      update email_verification_codes
      set consumed_at = now()
      where user_id = $1 and consumed_at is null
    `,
    [userId],
  );

  await pool.query(
    `
      insert into email_verification_codes (user_id, code_hash, expires_at)
      values ($1, $2, now() + ($3 || ' minutes')::interval)
    `,
    [userId, hashSecret(code), verificationMinutes],
  );

  await sendVerificationEmail(email, code);

  return {
    sent: true,
    devCode: env.AUTH_RETURN_DEV_CODE && env.NODE_ENV !== 'production' ? code : undefined,
  };
}

authRouter.get('/registration-state', async (request: AuthenticatedRequest, response) => {
  const user = await getPendingRegistrationUser(request);

  if (!user) {
    response.status(404).json({ message: 'No hay un registro pendiente.' });
    return;
  }

  response.json({
    status: 'verification_required',
    emailMasked: maskEmail(user.email),
  });
});

authRouter.post('/register', authLimiter, async (request, response) => {
  const parsed = registerSchema.safeParse(request.body);

  if (!parsed.success) {
    const fields = zodIssuesToRegisterFields(parsed.error.issues);
    response.status(400).json({
      message: 'Revisa los datos marcados.',
      fields,
    });
    return;
  }

  const passwordErrors = validatePasswordStrength(parsed.data.password);

  if (passwordErrors.length) {
    response.status(400).json({
      message: passwordErrors[0] ?? 'Contrasena invalida.',
      fields: { password: passwordErrors },
    });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const existing = await pool.query<UserRow>('select * from users where email = $1 limit 1', [
    parsed.data.email,
  ]);

  const existingUser = existing.rows[0];

  if (existingUser?.email_verified_at) {
    response.status(409).json({
      message: 'Ya existe una cuenta con ese email.',
      fields: { email: ['Ya existe una cuenta con ese email.'] },
    });
    return;
  }

  const userResult = existingUser
    ? await pool.query<UserRow>(
        `
          update users
          set name = $1, password_hash = $2, failed_login_attempts = 0, locked_until = null, updated_at = now()
          where id = $3
          returning *
        `,
        [parsed.data.name, passwordHash, existingUser.id],
      )
    : await pool.query<UserRow>(
        `
          insert into users (name, email, password_hash)
          values ($1, $2, $3)
          returning *
        `,
        [parsed.data.name, parsed.data.email, passwordHash],
      );

  const user = userResult.rows[0];

  if (!user) {
    response.status(500).json({ message: 'No se pudo crear la cuenta.' });
    return;
  }

  setPendingRegistrationCookie(response, user.id);

  response.status(201).json({
    message: 'Cuenta creada. Continua con la verificacion de email.',
    status: 'verification_required',
    nextPath: '/verify-email',
  });
});

authRouter.post('/send-verification', authLimiter, async (request: AuthenticatedRequest, response) => {
  const user = await getPendingRegistrationUser(request);

  if (!user) {
    response.status(404).json({ message: 'No hay un registro pendiente.' });
    return;
  }

  const result = await createAndSendVerificationCode(user.id, user.email);

  response.json({
    message: result.sent ? 'Codigo enviado.' : 'Ya enviamos un codigo recientemente.',
    status: 'verification_required',
    emailMasked: maskEmail(user.email),
    devCode: result.devCode,
  });
});

authRouter.post('/verify-email', authLimiter, async (request: AuthenticatedRequest, response) => {
  const parsed = verificationSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: 'Codigo invalido.' });
    return;
  }

  const user = await getPendingRegistrationUser(request);

  if (!user) {
    response.status(400).json({ message: 'No hay un registro pendiente para verificar.' });
    return;
  }

  const codeResult = await pool.query<{
    id: string;
    code_hash: string;
    attempts: number;
    max_attempts: number;
  }>(
    `
      select id, code_hash, attempts, max_attempts
      from email_verification_codes
      where user_id = $1
        and consumed_at is null
        and expires_at > now()
      order by created_at desc
      limit 1
    `,
    [user.id],
  );
  const storedCode = codeResult.rows[0];

  if (!storedCode || storedCode.attempts >= storedCode.max_attempts) {
    response.status(400).json({ message: 'Codigo invalido o vencido.' });
    return;
  }

  const codeMatches = safeEqualHash(storedCode.code_hash, hashSecret(parsed.data.code));

  if (!codeMatches) {
    await pool.query('update email_verification_codes set attempts = attempts + 1 where id = $1', [
      storedCode.id,
    ]);
    response.status(400).json({ message: 'Codigo invalido o vencido.' });
    return;
  }

  const verifiedUser = await pool.query<UserRow>(
    `
      update users
      set email_verified_at = coalesce(email_verified_at, now()), updated_at = now()
      where id = $1
      returning *
    `,
    [user.id],
  );

  await pool.query('update email_verification_codes set consumed_at = now() where id = $1', [
    storedCode.id,
  ]);

  clearPendingRegistrationCookie(response);
  await createSession({
    userId: user.id,
    userAgent: request.get('user-agent'),
    ip: request.ip,
    response,
  });

  response.json({ message: 'Email verificado.', user: toPublicUser(verifiedUser.rows[0] ?? user) });
});

authRouter.post('/resend-verification', authLimiter, async (request: AuthenticatedRequest, response) => {
  const user = await getPendingRegistrationUser(request);

  if (!user) {
    response.status(404).json({ message: 'No hay un registro pendiente.' });
    return;
  }

  const result = await createAndSendVerificationCode(user.id, user.email, true);

  response.json({
    message: 'Nuevo codigo enviado.',
    status: 'verification_required',
    emailMasked: maskEmail(user.email),
    devCode: result.devCode,
  });
});

authRouter.post('/login', loginLimiter, async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: 'Credenciales invalidas.' });
    return;
  }

  const userResult = await pool.query<UserRow>('select * from users where email = $1 limit 1', [
    parsed.data.email,
  ]);
  const user = userResult.rows[0];

  if (!user) {
    response.status(401).json({ message: 'Credenciales invalidas.' });
    return;
  }

  if (user.banned_at) {
    response.status(403).json({ message: 'Tu cuenta fue suspendida por un administrador.' });
    return;
  }

  if (user.locked_until && user.locked_until > new Date()) {
    response.status(423).json({ message: 'Cuenta bloqueada temporalmente. Intenta mas tarde.' });
    return;
  }

  if (!user.password_hash) {
    response.status(401).json({
      message: 'Esta cuenta usa Google. Usa el boton Continuar con Google.',
    });
    return;
  }

  const validPassword = await verifyPassword(user.password_hash, parsed.data.password);

  if (!validPassword) {
    const attempts = user.failed_login_attempts + 1;
    const shouldLock = attempts >= maxLoginAttempts;

    await pool.query(
      `
        update users
        set failed_login_attempts = $1,
            locked_until = case when $2 then now() + ($3 || ' minutes')::interval else locked_until end,
            updated_at = now()
        where id = $4
      `,
      [attempts, shouldLock, lockMinutes, user.id],
    );

    response.status(401).json({ message: 'Credenciales invalidas.' });
    return;
  }

  await pool.query(
    'update users set failed_login_attempts = 0, locked_until = null, updated_at = now() where id = $1',
    [user.id],
  );

  if (!user.email_verified_at) {
    setPendingRegistrationCookie(response, user.id);
    response.status(403).json({
      message: 'Debes verificar tu email antes de iniciar sesion.',
      status: 'verification_required',
      nextPath: '/verify-email',
    });
    return;
  }

  await createSession({
    userId: user.id,
    userAgent: request.get('user-agent'),
    ip: request.ip,
    response,
  });

  response.json({ message: 'Sesion iniciada.', user: toPublicUser(user) });
});

authRouter.post('/google', loginLimiter, async (request, response) => {
  if (!env.GOOGLE_CLIENT_ID) {
    response.status(503).json({ message: 'Inicio de sesion con Google no esta configurado.' });
    return;
  }

  const parsed = googleCredentialSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: 'Credencial de Google invalida.' });
    return;
  }

  try {
    const profile = await verifyGoogleIdToken(parsed.data.credential);
    const upsert = await upsertUserFromGoogle(profile);

    if (!upsert.ok) {
      response.status(409).json({
        message: 'Ese email ya esta vinculado a otra cuenta de Google.',
      });
      return;
    }

    const user = upsert.user;

    if (user.banned_at) {
      response.status(403).json({ message: 'Tu cuenta fue suspendida por un administrador.' });
      return;
    }

    if (user.locked_until && user.locked_until > new Date()) {
      response.status(423).json({ message: 'Cuenta bloqueada temporalmente. Intenta mas tarde.' });
      return;
    }

    await pool.query(
      'update users set failed_login_attempts = 0, locked_until = null, updated_at = now() where id = $1',
      [user.id],
    );

    clearPendingRegistrationCookie(response);

    await createSession({
      userId: user.id,
      userAgent: request.get('user-agent'),
      ip: request.ip,
      response,
    });

    response.json({ message: 'Sesion iniciada.', user: toPublicUser(user) });
  } catch (error) {
    const pgCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    const detail = error instanceof Error ? error.message : '';

    if (env.NODE_ENV !== 'production') {
      console.error('[auth/google]', error);
    }

    if (
      pgCode === '42703' ||
      detail.includes('google_sub') ||
      detail.includes('column') && detail.includes('does not exist')
    ) {
      response.status(503).json({
        message:
          'Falta migracion en la base de datos. En la carpeta server ejecuta: npm run db:migrate',
      });
      return;
    }

    if (pgCode === '23502' || /\bpassword_hash\b/i.test(detail)) {
      response.status(503).json({
        message:
          'La base no permite usuarios sin contrasena. Ejecuta npm run db:migrate (migracion 002_google_oauth).',
      });
      return;
    }

    if (detail.includes('Client ID') || detail.includes('Wrong recipient')) {
      response.status(401).json({
        message:
          'Configuracion de Google incorrecta: el Client ID del servidor debe ser el mismo que en el cliente (.env VITE_GOOGLE_CLIENT_ID).',
      });
      return;
    }

    if (detail.includes('email de Google no esta verificado')) {
      response.status(403).json({ message: detail });
      return;
    }

    if (detail.includes('Token de Google incompleto')) {
      response.status(401).json({ message: detail });
      return;
    }

    response.status(401).json({ message: 'No pudimos validar la cuenta de Google.' });
  }
});

authRouter.get('/me', requireAuth, (request: AuthenticatedRequest, response) => {
  response.json({ user: request.auth?.user });
});

authRouter.post('/logout', requireAuth, async (request: AuthenticatedRequest, response) => {
  await pool.query('update user_sessions set revoked_at = now() where id = $1', [
    request.auth?.sessionId,
  ]);
  clearSessionCookie(response);
  response.json({ message: 'Sesion cerrada.' });
});

export { authRouter };
