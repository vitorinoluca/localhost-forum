import type { PublicUser } from '../types/auth.js';
import type { PublicProfile } from '../types/profile.js';

export type DbUserPublicRow = {
  id: string;
  email: string;
  name: string;
  email_verified_at: Date | null;
  created_at: Date;
  bio: string | null;
  avatar_url: string | null;
  avatar_storage_path?: string | null;
  role?: string | null;
};

export function toPublicUser(row: DbUserPublicRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: Boolean(row.email_verified_at),
    createdAt: row.created_at.toISOString(),
    bio: row.bio ?? null,
    avatarUrl: row.avatar_url ?? null,
    role: row.role === 'superadmin' ? 'superadmin' : 'user',
  };
}

export function toPublicProfile(
  row: Pick<DbUserPublicRow, 'id' | 'name' | 'bio' | 'avatar_url' | 'created_at'>,
  postsCount: number,
): PublicProfile {
  return {
    id: row.id,
    name: row.name,
    bio: row.bio ?? null,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at.toISOString(),
    postsCount,
  };
}
