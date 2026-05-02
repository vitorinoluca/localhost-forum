import { env } from '../config/env.js';

export function httpOnlyCookieAttributes(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'none';
  path: '/';
} {
  const production = env.NODE_ENV === 'production';
  const sameSite =
    env.SESSION_COOKIE_SAME_SITE ?? (production ? 'none' : 'lax');
  return {
    httpOnly: true,
    secure: production,
    sameSite,
    path: '/',
  };
}
