import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

export type GoogleUserClaims = {
  sub: string;
  email: string;
  name: string;
};

export type GoogleOAuthUserRow = {
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

function audienceIncludesClientId(aud: unknown, clientId: string): boolean {
  if (typeof aud === 'string') return aud === clientId;
  if (Array.isArray(aud)) return aud.includes(clientId);
  return false;
}

export async function verifyGoogleIdToken(credential: string): Promise<GoogleUserClaims> {
  const expectedClientId = env.GOOGLE_CLIENT_ID;
  if (!expectedClientId) {
    throw new Error('Google OAuth no configurado.');
  }

  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken: credential,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || typeof payload.email !== 'string') {
    throw new Error('Token de Google incompleto.');
  }

  if (!audienceIncludesClientId(payload.aud, expectedClientId)) {
    throw new Error(
      'El Client ID del servidor no coincide con el del token. Revisa GOOGLE_CLIENT_ID y que sea el mismo que VITE_GOOGLE_CLIENT_ID.',
    );
  }

  const rawVerified = payload.email_verified as boolean | string | undefined;
  const emailVerified = rawVerified === true || rawVerified === 'true';

  if (!emailVerified) {
    throw new Error('El email de Google no esta verificado.');
  }

  const email = payload.email.trim().toLowerCase();
  const rawName = typeof payload.name === 'string' ? payload.name.trim() : '';
  const name = rawName.slice(0, 80) || 'Usuario';

  return { sub: payload.sub, email, name };
}

export async function upsertUserFromGoogle(
  profile: GoogleUserClaims,
): Promise<{ ok: true; user: GoogleOAuthUserRow } | { ok: false; reason: 'google_mismatch' }> {
  const connection = await pool.connect();

  try {
    await connection.query('begin');

    const bySub = await connection.query<GoogleOAuthUserRow>(
      'select * from users where google_sub = $1 limit 1',
      [profile.sub],
    );
    const existingSub = bySub.rows[0];
    if (existingSub) {
      await connection.query('commit');
      return { ok: true, user: existingSub };
    }

    const byEmail = await connection.query<GoogleOAuthUserRow>(
      'select * from users where email = $1 limit 1',
      [profile.email],
    );
    const existingEmail = byEmail.rows[0];

    if (existingEmail) {
      if (existingEmail.google_sub && existingEmail.google_sub !== profile.sub) {
        await connection.query('rollback');
        return { ok: false, reason: 'google_mismatch' };
      }

      const updated = await connection.query<GoogleOAuthUserRow>(
        `
          update users
          set google_sub = $1,
              email_verified_at = coalesce(email_verified_at, now()),
              failed_login_attempts = 0,
              locked_until = null,
              name = case when length(trim($2)) > 0 then trim($2) else name end,
              updated_at = now()
          where id = $3
          returning *
        `,
        [profile.sub, profile.name, existingEmail.id],
      );

      const user = updated.rows[0];
      if (!user) {
        await connection.query('rollback');
        throw new Error('No se pudo vincular la cuenta de Google.');
      }

      await connection.query('commit');
      return { ok: true, user };
    }

    const inserted = await connection.query<GoogleOAuthUserRow>(
      `
        insert into users (email, name, password_hash, google_sub, email_verified_at)
        values ($1, $2, null, $3, now())
        returning *
      `,
      [profile.email, profile.name, profile.sub],
    );

    const created = inserted.rows[0];
    if (!created) {
      await connection.query('rollback');
      throw new Error('No se pudo crear la cuenta.');
    }

    await connection.query('commit');
    return { ok: true, user: created };
  } catch (error) {
    await connection.query('rollback').catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
