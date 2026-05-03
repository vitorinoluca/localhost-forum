import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperadmin } from '../middleware/require-superadmin.js';
import { removeForumObjects } from '../services/supabase-storage.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const adminRouter = Router();
adminRouter.use(requireAuth, requireSuperadmin);

adminRouter.get('/stats', async (_request, response) => {
  const [users, posts] = await Promise.all([
    pool.query<{ c: number }>(`select count(*)::int as c from users`),
    pool.query<{ c: number }>(`select count(*)::int as c from forum_posts`),
  ]);

  response.json({
    usersTotal: users.rows[0]?.c ?? 0,
    postsTotal: posts.rows[0]?.c ?? 0,
  });
});

adminRouter.get('/users', async (request, response) => {
  const limit = Math.min(Number(request.query.limit) || 50, 200);
  const offset = Number(request.query.offset) || 0;
  const q = typeof request.query.q === 'string' ? request.query.q.trim() : '';

  const result = await pool.query(
    `
      select id, email, name, role, banned_at, ban_reason, created_at
      from users
      where ($3 = '' or email ilike '%' || $3 || '%' or name ilike '%' || $3 || '%')
      order by created_at desc
      limit $1 offset $2
    `,
    [limit, offset, q],
  );

  response.json({ users: result.rows });
});

const banSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

adminRouter.post('/users/:userId/ban', async (request: AuthenticatedRequest, response) => {
  const idParse = z.string().uuid().safeParse(request.params.userId);
  if (!idParse.success) {
    response.status(400).json({ message: 'Usuario invalido.' });
    return;
  }
  if (idParse.data === request.auth?.user.id) {
    response.status(400).json({ message: 'No podes suspender tu propia cuenta.' });
    return;
  }
  const parsed = banSchema.safeParse(request.body);
  const reason = parsed.success ? parsed.data.reason : undefined;

  const target = await pool.query<{ role: string }>(`select role from users where id = $1 limit 1`, [idParse.data]);
  if (target.rows[0]?.role === 'superadmin') {
    response.status(400).json({ message: 'No se puede suspender a otro superadmin.' });
    return;
  }

  await pool.query(
    `update users set banned_at = now(), ban_reason = $2, updated_at = now() where id = $1`,
    [idParse.data, reason ?? null],
  );

  response.json({ message: 'Usuario suspendido.' });
});

adminRouter.post('/users/:userId/unban', async (request, response) => {
  const idParse = z.string().uuid().safeParse(request.params.userId);
  if (!idParse.success) {
    response.status(400).json({ message: 'Usuario invalido.' });
    return;
  }
  await pool.query(
    `update users set banned_at = null, ban_reason = null, updated_at = now() where id = $1`,
    [idParse.data],
  );
  response.json({ message: 'Suspension levantada.' });
});

adminRouter.get('/posts/recent', async (request, response) => {
  const limit = Math.min(Number(request.query.limit) || 30, 100);
  const r = await pool.query(
    `
      select p.id, p.title, left(p.body, 200) as body_preview, p.created_at, u.name as author_name, u.email as author_email
      from forum_posts p
      join users u on u.id = p.user_id
      order by p.created_at desc
      limit $1
    `,
    [limit],
  );
  response.json({ posts: r.rows });
});

adminRouter.delete('/posts/:postId', async (request, response) => {
  const postId = z.string().uuid().safeParse(request.params.postId);
  if (!postId.success) {
    response.status(400).json({ message: 'Publicacion invalida.' });
    return;
  }

  const paths = await pool.query<{ storage_path: string }>(
    `select storage_path from forum_post_attachments where post_id = $1`,
    [postId.data],
  );
  const objectPaths = paths.rows.map((row) => row.storage_path);

  const del = await pool.query(`delete from forum_posts where id = $1 returning id`, [postId.data]);
  if (!del.rowCount) {
    response.status(404).json({ message: 'Publicacion no encontrada.' });
    return;
  }

  await removeForumObjects(objectPaths);
  response.json({ message: 'Publicacion eliminada.' });
});

export { adminRouter };
