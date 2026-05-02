import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

export async function promoteSuperadminEmails(): Promise<void> {
  const raw = env.SUPERADMIN_EMAILS?.trim();
  if (!raw) return;

  const emails = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) return;

  const result = await pool.query(`update users set role = 'superadmin', updated_at = now() where lower(email::text) = any($1)`, [
    emails,
  ]);

  if (result.rowCount && result.rowCount > 0) {
    console.log(`[superadmin] Rol superadmin asignado a ${result.rowCount} cuenta(s).`);
  }
}
