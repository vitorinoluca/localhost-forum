import { jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { JWT_AUDIENCE, JWT_ISSUER } from './jwt-auth-config.js';
import { toPublicUser, type DbUserPublicRow } from './public-user.js';

function secretKey() {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

const USER_FOR_SESSION_QUERY = `
      select
        u.id,
        u.email,
        u.name,
        u.email_verified_at,
        u.created_at,
        u.bio,
        u.avatar_url,
        u.role
      from users u
      where u.id = $1::uuid
        and u.email_verified_at is not null
        and u.banned_at is null
      limit 1
    `;

export async function loadSessionFromToken(token: string | undefined) {
  if (typeof token !== 'string' || !token.trim()) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const sub = payload.sub;
    if (typeof sub !== 'string') return null;
    userId = sub;
  } catch {
    return null;
  }

  const session = await pool.query<DbUserPublicRow>(USER_FOR_SESSION_QUERY, [userId]);
  const row = session.rows[0];
  if (!row) return null;

  return {
    user: toPublicUser(row),
  };
}
