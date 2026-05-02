import { pool } from '../db/pool.js';
import { hashSecret } from './tokens.js';
import { toPublicUser, type DbUserPublicRow } from './public-user.js';

type SessionJoinRow = DbUserPublicRow & { session_id: string };

const SESSION_QUERY = `
      select
        s.id as session_id,
        u.id,
        u.email,
        u.name,
        u.email_verified_at,
        u.created_at,
        u.bio,
        u.avatar_url,
        u.role
      from user_sessions s
      join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
        and u.email_verified_at is not null
        and u.banned_at is null
      limit 1
    `;

export async function loadSessionFromToken(token: string | undefined) {
  if (typeof token !== 'string') return null;
  const session = await pool.query<SessionJoinRow>(SESSION_QUERY, [hashSecret(token)]);
  const row = session.rows[0];
  if (!row) return null;
  return {
    sessionId: row.session_id,
    user: toPublicUser(row),
  };
}
