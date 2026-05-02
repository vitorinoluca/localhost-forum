import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { toPublicProfile, toPublicUser, type DbUserPublicRow } from '../services/public-user.js';
import { removeForumObjects, uploadForumImage } from '../services/supabase-storage.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const usersRouter = Router();

const profilePatchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedAvatarTypes = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedAvatarTypes.has(file.mimetype)) {
      callback(new Error('Solo se permiten imagenes JPG, PNG o WEBP.'));
      return;
    }
    callback(null, true);
  },
});

const profileBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  bio: z.string().max(500).transform((value) => {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }),
  removeAvatar: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
});

usersRouter.patch(
  '/me/profile',
  profilePatchLimiter,
  requireAuth,
  avatarUpload.single('avatar'),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const parsedBody = profileBodySchema.safeParse({
        name: request.body?.name,
        bio: request.body?.bio,
        removeAvatar: request.body?.removeAvatar,
      });

      if (!parsedBody.success) {
        response.status(400).json({
          message: 'Datos invalidos.',
          issues: parsedBody.error.issues,
        });
        return;
      }

      const userId = request.auth!.user.id;
      const file = request.file;

      const currentResult = await pool.query<{
        avatar_url: string | null;
        avatar_storage_path: string | null;
      }>('select avatar_url, avatar_storage_path from users where id = $1 limit 1', [userId]);

      const current = currentResult.rows[0];
      if (!current) {
        response.status(404).json({ message: 'Usuario no encontrado.' });
        return;
      }

      const pathsToRemove: string[] = [];
      let nextAvatarUrl = current.avatar_url;
      let nextAvatarPath = current.avatar_storage_path;

      if (file?.buffer?.length) {
        const extension = allowedAvatarTypes.get(file.mimetype) ?? '';
        const storedName = `${randomUUID()}${extension}`;
        const objectPath = `avatars/${userId}/${storedName}`;
        nextAvatarUrl = await uploadForumImage(file.buffer, file.mimetype, objectPath);
        nextAvatarPath = objectPath;
        if (current.avatar_storage_path) pathsToRemove.push(current.avatar_storage_path);
      } else if (parsedBody.data.removeAvatar) {
        nextAvatarUrl = null;
        nextAvatarPath = null;
        if (current.avatar_storage_path) pathsToRemove.push(current.avatar_storage_path);
      }

      const updateResult = await pool.query<DbUserPublicRow>(
        `
          update users
          set name = $1,
              bio = $2,
              avatar_url = $3,
              avatar_storage_path = $4,
              updated_at = now()
          where id = $5
          returning id, email, name, email_verified_at, created_at, bio, avatar_url
        `,
        [
          parsedBody.data.name,
          parsedBody.data.bio,
          nextAvatarUrl,
          nextAvatarPath,
          userId,
        ],
      );

      const updated = updateResult.rows[0];
      if (!updated) {
        response.status(404).json({ message: 'Usuario no encontrado.' });
        return;
      }

      await removeForumObjects(pathsToRemove);

      response.json({ message: 'Perfil actualizado.', user: toPublicUser(updated) });
    } catch (error) {
      next(error);
    }
  },
);

usersRouter.get('/:userId', async (request, response) => {
  const idParse = z.string().uuid().safeParse(request.params.userId);

  if (!idParse.success) {
    response.status(404).json({ message: 'Usuario no encontrado.' });
    return;
  }

  const result = await pool.query<
    Pick<DbUserPublicRow, 'id' | 'name' | 'bio' | 'avatar_url' | 'created_at'> & {
      posts_count: number;
    }
  >(
    `
      select
        u.id,
        u.name,
        u.bio,
        u.avatar_url,
        u.created_at,
        (
          select count(*)::int
          from forum_posts p
          where p.user_id = u.id
        ) as posts_count
      from users u
      where u.id = $1 and u.email_verified_at is not null
      limit 1
    `,
    [idParse.data],
  );

  const row = result.rows[0];

  if (!row) {
    response.status(404).json({ message: 'Usuario no encontrado.' });
    return;
  }

  const postsCount = Number(row.posts_count ?? 0);
  response.json({
    profile: toPublicProfile(
      {
        id: row.id,
        name: row.name,
        bio: row.bio,
        avatar_url: row.avatar_url,
        created_at: row.created_at,
      },
      postsCount,
    ),
  });
});

usersRouter.use(
  (
    error: unknown,
    _request: AuthenticatedRequest,
    response: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (error instanceof multer.MulterError) {
      response.status(400).json({
        message: 'No se pudo subir la imagen.',
        ...(env.NODE_ENV !== 'production' ? { detail: error.message } : {}),
      });
      return;
    }

    if (error instanceof Error && error.message.startsWith('Solo se permiten imagenes')) {
      response.status(400).json({ message: error.message });
      return;
    }

    next(error);
  },
);

export { usersRouter };
