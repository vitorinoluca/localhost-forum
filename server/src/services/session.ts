import type { Response } from 'express';
import { SignJWT } from 'jose';
import { env } from '../config/env.js';
import { httpOnlyCookieAttributes } from '../utils/http-only-cookie.js';
import { JWT_AUDIENCE, JWT_ISSUER } from './jwt-auth-config.js';

const sessionDurationMs = 1000 * 60 * 60 * 24 * 7;

function secretKey() {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function createSession({
  userId,
  userAgent: _userAgent,
  response,
}: {
  userId: string;
  userAgent?: string;
  response: Response;
}) {
  void _userAgent;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(new Date(Date.now() + sessionDurationMs))
    .sign(secretKey());

  response.cookie(env.SESSION_COOKIE_NAME, token, {
    ...httpOnlyCookieAttributes(),
    maxAge: sessionDurationMs,
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(env.SESSION_COOKIE_NAME, httpOnlyCookieAttributes());
}
