import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, '../../migrations');

async function migrate() {
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

migrate()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
