import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pool } from './pool.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, '../../migrations');

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href;
  } catch {
    return false;
  }
}

export async function runMigrations(): Promise<void> {
  await pool.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const alreadyApplied = await pool.query('select 1 from schema_migrations where name = $1', [
      file,
    ]);

    if (alreadyApplied.rowCount) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), 'utf8');

    await pool.query('begin');
    try {
      await pool.query(sql);
      await pool.query('insert into schema_migrations (name) values ($1)', [file]);
      await pool.query('commit');
      console.log(`Migracion aplicada: ${file}`);
    } catch (error) {
      await pool.query('rollback');
      throw error;
    }
  }
}

if (isMainModule()) {
  runMigrations()
    .then(async () => {
      await pool.end();
    })
    .catch(async (error: unknown) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}
