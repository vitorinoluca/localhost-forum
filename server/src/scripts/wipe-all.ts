import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

function isConfirmed() {
  return process.argv.includes('--confirm');
}

function assertProductionAllowed() {
  if (env.NODE_ENV !== 'production') return;
  if (process.env.WIPE_ALLOW_PRODUCTION !== 'yes') {
    console.error(
      'Refused in NODE_ENV=production. Set WIPE_ALLOW_PRODUCTION=yes if you really want this.',
    );
    process.exit(1);
  }
}

function isFileEntry(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const size = metadata.size;
  return typeof size === 'number' && !Number.isNaN(size);
}

async function wipeStorageBucket(): Promise<number> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const bucket = env.SUPABASE_STORAGE_BUCKET;
  let deletedFiles = 0;

  async function walk(prefix: string): Promise<void> {
    let offset = 0;
    const limit = 1000;

    for (;;) {
      const { data: entries, error } = await supabase.storage.from(bucket).list(prefix, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) {
        throw new Error(`Storage list (${prefix || '/'}): ${error.message}`);
      }

      if (!entries?.length) {
        break;
      }

      const filePaths: string[] = [];

      for (const item of entries) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

        if (isFileEntry(item.metadata)) {
          filePaths.push(fullPath);
        } else {
          await walk(fullPath);
        }
      }

      if (filePaths.length > 0) {
        const { error: removeError } = await supabase.storage.from(bucket).remove(filePaths);
        if (removeError) {
          throw new Error(`Storage remove: ${removeError.message}`);
        }
        deletedFiles += filePaths.length;
      }

      if (entries.length < limit) {
        break;
      }
      offset += limit;
    }
  }

  await walk('');
  return deletedFiles;
}

async function wipeDatabase(): Promise<void> {
  await pool.query(`
    truncate table
      notifications,
      forum_post_comments,
      forum_post_reactions,
      forum_post_attachments,
      forum_posts,
      email_verification_codes,
      user_sessions,
      users
    restart identity cascade
  `);
}

async function main() {
  if (!isConfirmed()) {
    console.error('Usage: tsx src/scripts/wipe-all.ts --confirm');
    console.error('Optional production: WIPE_ALLOW_PRODUCTION=yes');
    process.exit(1);
  }

  assertProductionAllowed();

  console.error('Wiping Postgres application tables…');
  await wipeDatabase();
  console.error('Postgres OK.');

  console.error('Wiping Supabase Storage bucket', env.SUPABASE_STORAGE_BUCKET, '…');
  const n = await wipeStorageBucket();
  console.error('Storage OK.', n, 'object(s) removed.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
