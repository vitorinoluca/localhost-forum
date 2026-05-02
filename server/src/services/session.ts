import type { Response } from 'express';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { httpOnlyCookieAttributes } from '../utils/http-only-cookie.js';
import { createSessionToken, hashSecret } from './tokens.js';

const sessionDurationMs = 1000 * 60 * 60 * 24 * 7;

export async function createSession({
  userId,
  userAgent,
  response,
}: {
  userId: string;
  userAgent?: string;
  response: Response;
}) {
  const token = createSessionToken();
  const tokenHash = hashSecret(token);
  const expiresAt = new Date(Date.now() + sessionDurationMs);

  await pool.query(
    `
      insert into user_sessions (user_id, token_hash, user_agent, ip_address, expires_at)
      values ($1, $2, $3, null, $4)
    `,
    [userId, tokenHash, userAgent ?? null, expiresAt],
  );

  response.cookie(env.SESSION_COOKIE_NAME, token, {
    ...httpOnlyCookieAttributes(),
    maxAge: sessionDurationMs,
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(env.SESSION_COOKIE_NAME, httpOnlyCookieAttributes());
}
