import pg from 'pg';
import { env } from '../config/env.js';

function parseDatabaseUrl() {
  const databaseUrl = new URL(env.DATABASE_URL);

  return {
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    host: databaseUrl.hostname,
    port: databaseUrl.port ? Number(databaseUrl.port) : 5432,
    database: decodeURIComponent(databaseUrl.pathname.replace(/^\//, '')),
    sslMode: databaseUrl.searchParams.get('sslmode')?.toLowerCase(),
  };
}

function shouldUseSsl() {
  if (env.DATABASE_SSL) {
    return true;
  }

  const { sslMode } = parseDatabaseUrl();
  return sslMode === 'require' || sslMode === 'prefer' || sslMode === 'no-verify';
}

function shouldRejectUnauthorized() {
  if (typeof env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'boolean') {
    return env.DATABASE_SSL_REJECT_UNAUTHORIZED;
  }

  return env.NODE_ENV === 'production';
}

const databaseConfig = parseDatabaseUrl();
const useSsl = shouldUseSsl();

export const pool = new pg.Pool({
  user: databaseConfig.user,
  password: databaseConfig.password,
  host: databaseConfig.host,
  port: databaseConfig.port,
  database: databaseConfig.database,
  ssl: useSsl ? { rejectUnauthorized: shouldRejectUnauthorized() } : undefined,
});

export async function checkDatabaseConnection() {
  const result = await pool.query<{ now: Date }>('select now()');
  return result.rows[0]?.now;
}
