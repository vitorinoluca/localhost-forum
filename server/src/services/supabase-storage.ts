import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function uploadForumImage(
  buffer: Buffer,
  mimeType: string,
  objectPath: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(objectPath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`No se pudo subir el archivo: ${error.message}`);
  }

  const { data } = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath);

  return data.publicUrl;
}

export async function removeForumObjects(paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove(paths);
  if (error) {
    console.error('Supabase Storage remove:', error.message);
  }
}

export async function downloadForumObject(objectPath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).download(objectPath);
  if (error || !data) {
    throw new Error(`No se pudo descargar el archivo: ${error?.message ?? 'sin datos'}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function moveForumObject(fromPath: string, toPath: string): Promise<void> {
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).move(fromPath, toPath);
  if (error) {
    throw new Error(`No se pudo mover el archivo: ${error.message}`);
  }
}

export function getForumObjectPublicUrl(objectPath: string): string {
  const { data } = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}
