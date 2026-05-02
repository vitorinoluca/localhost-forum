import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { notifyPostAuthorOfComment } from '../services/in-app-notifications.js';
import { getForumPostForViewer, listForumPostsForViewer } from '../services/forum-posts.js';
import { removeForumObjects, uploadForumImage } from '../services/supabase-storage.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const forumRouter = Router();

const forumCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedImageTypes = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 4,
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new Error('Solo se permiten imagenes JPG, PNG, WEBP o GIF.'));
      return;
    }
    callback(null, true);
  },
});

const postSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(1).max(5000),
});

const reactionSchema = z.object({
  reaction: z.enum(['like', 'dislike']),
});

const commentSchema = z.object({
  body: z.string().trim().min(1).max(1500),
});

forumRouter.get('/posts', optionalAuth, async (request: AuthenticatedRequest, response) => {
  const userId = request.auth?.user.id ?? null;
  const posts = await listForumPostsForViewer(userId);
  response.json({ posts });
});

forumRouter.get('/posts/:postId', optionalAuth, async (request: AuthenticatedRequest, response) => {
  const parsedId = z.string().uuid().safeParse(request.params.postId);
  if (!parsedId.success) {
    response.status(400).json({ message: 'Identificador de publicacion invalido.' });
    return;
  }

  const userId = request.auth?.user.id ?? null;
  const post = await getForumPostForViewer(userId, parsedId.data);
  if (!post) {
    response.status(404).json({ message: 'Publicacion no encontrada.' });
    return;
  }

  response.json({ post });
});

forumRouter.delete('/posts/:postId', requireAuth, async (request: AuthenticatedRequest, response) => {
  const { postId } = request.params;
  const parsedId = z.string().uuid().safeParse(postId);
  if (!parsedId.success) {
    response.status(400).json({ message: 'Identificador de publicacion invalido.' });
    return;
  }

  const userId = request.auth?.user.id;
  if (!userId) {
    response.status(401).json({ message: 'Sesion requerida.' });
    return;
  }

  const attachments = await pool.query<{ storage_path: string }>(
    `select storage_path from forum_post_attachments where post_id = $1`,
    [postId],
  );
  const objectPaths = attachments.rows.map((row) => row.storage_path);

  const deleted = await pool.query<{ id: string }>(
    `delete from forum_posts where id = $1 and user_id = $2 returning id`,
    [postId, userId],
  );

  if (!deleted.rowCount) {
    const exists = await pool.query('select 1 from forum_posts where id = $1 limit 1', [postId]);
    response
      .status(exists.rowCount ? 403 : 404)
      .json({
        message: exists.rowCount
          ? 'No podes eliminar una publicacion de otro usuario.'
          : 'Publicacion no encontrada.',
      });
    return;
  }

  await removeForumObjects(objectPaths);
  response.json({ message: 'Publicacion eliminada.' });
});

forumRouter.post(
  '/posts',
  forumCreateLimiter,
  requireAuth,
  upload.array('images', 4),
  async (request: AuthenticatedRequest, response) => {
    const parsed = postSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ message: 'Publicacion invalida.', issues: parsed.error.issues });
      return;
    }

    const files = Array.isArray(request.files) ? request.files : [];

    const client = await pool.connect();
    const uploadedObjectPaths: string[] = [];

    try {
      await client.query('begin');

      const postResult = await client.query<{ id: string }>(
        `
          insert into forum_posts (user_id, title, body, moderation_pending)
          values ($1, $2, $3, $4)
          returning id
        `,
        [request.auth?.user.id, parsed.data.title, parsed.data.body, false],
      );
      const postId = postResult.rows[0]?.id;

      if (!postId) {
        throw new Error('No se pudo crear la publicacion.');
      }

      for (const file of files) {
        const extension = allowedImageTypes.get(file.mimetype) ?? '';
        const storedName = `${randomUUID()}${extension}`;
        const objectPath = `forum/${postId}/${storedName}`;
        const attachmentModeration = 'approved';
        if (!file.buffer?.length) {
          throw new Error('Archivo de imagen vacio o invalido.');
        }

        const publicUrl = await uploadForumImage(file.buffer, file.mimetype, objectPath);
        uploadedObjectPaths.push(objectPath);

        await client.query(
          `
            insert into forum_post_attachments
              (post_id, original_name, stored_name, mime_type, size_bytes, url, storage_path, moderation_status)
            values ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            postId,
            file.originalname,
            storedName,
            file.mimetype,
            file.size,
            publicUrl,
            objectPath,
            attachmentModeration,
          ],
        );
      }

      await client.query('commit');
      response.status(201).json({
        message: 'Publicacion creada.',
        postId,
      });
    } catch (error) {
      await client.query('rollback');
      await removeForumObjects(uploadedObjectPaths);
      throw error;
    } finally {
      client.release();
    }
  },
);

forumRouter.post('/posts/:postId/reaction', requireAuth, async (request: AuthenticatedRequest, response) => {
  const { postId } = request.params;
  const parsed = reactionSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: 'Reaccion invalida.' });
    return;
  }

  const postExists = await pool.query('select 1 from forum_posts where id = $1 limit 1', [postId]);
  if (!postExists.rowCount) {
    response.status(404).json({ message: 'Publicacion no encontrada.' });
    return;
  }

  await pool.query(
    `
      insert into forum_post_reactions (post_id, user_id, reaction_type)
      values ($1, $2, $3)
      on conflict (post_id, user_id)
      do update
      set reaction_type = excluded.reaction_type,
          updated_at = now()
    `,
    [postId, request.auth?.user.id, parsed.data.reaction],
  );

  response.json({ message: 'Reaccion registrada.' });
});

forumRouter.delete('/posts/:postId/reaction', requireAuth, async (request: AuthenticatedRequest, response) => {
  const { postId } = request.params;
  await pool.query('delete from forum_post_reactions where post_id = $1 and user_id = $2', [
    postId,
    request.auth?.user.id,
  ]);

  response.json({ message: 'Reaccion eliminada.' });
});

forumRouter.post('/posts/:postId/comments', requireAuth, async (request: AuthenticatedRequest, response) => {
  const postIdParse = z.string().uuid().safeParse(request.params.postId);
  if (!postIdParse.success) {
    response.status(400).json({ message: 'Publicacion invalida.' });
    return;
  }
  const postId = postIdParse.data;
  const parsed = commentSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: 'Comentario invalido.', issues: parsed.error.issues });
    return;
  }

  const postExists = await pool.query('select 1 from forum_posts where id = $1 limit 1', [postId]);
  if (!postExists.rowCount) {
    response.status(404).json({ message: 'Publicacion no encontrada.' });
    return;
  }

  const inserted = await pool.query<{ id: string }>(
    `
      insert into forum_post_comments (post_id, user_id, body)
      values ($1, $2, $3)
      returning id
    `,
    [postId, request.auth?.user.id, parsed.data.body],
  );

  const commentId = inserted.rows[0]?.id;
  const commenterId = request.auth?.user.id;
  if (!commentId || !commenterId) {
    response.status(500).json({ message: 'No se pudo guardar el comentario.' });
    return;
  }

  const postMeta = await pool.query<{ user_id: string; title: string }>(
    `select user_id, title from forum_posts where id = $1`,
    [postId],
  );
  const meta = postMeta.rows[0];

  if (meta && meta.user_id !== commenterId) {
    const actor = await pool.query<{ name: string }>(
      `select name from users where id = $1`,
      [commenterId],
    );
    try {
      await notifyPostAuthorOfComment({
        postAuthorId: meta.user_id,
        commenterId,
        commenterName: actor.rows[0]?.name ?? 'Alguien',
        postId,
        postTitle: meta.title,
        commentId,
      });
    } catch (error) {
      console.error('notifyPostAuthorOfComment', error);
    }
  }

  response.status(201).json({ message: 'Comentario agregado.' });
});

forumRouter.use(
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

export { forumRouter };
