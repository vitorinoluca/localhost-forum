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
  const [users, posts, visits24, visits7d, topCountries, recent] = await Promise.all([
    pool.query<{ c: number }>(`select count(*)::int as c from users`),
    pool.query<{ c: number }>(`select count(*)::int as c from forum_posts`),
    pool.query<{ c: number }>(
      `select count(*)::int as c from analytics_visits where created_at > now() - interval '24 hours'`,
    ),
    pool.query<{ c: number }>(
      `select count(*)::int as c from analytics_visits where created_at > now() - interval '7 days'`,
    ),
    pool.query<{ country_code: string; n: number }>(
      `
        select country_code, count(*)::int as n
        from analytics_visits
        where created_at > now() - interval '30 days' and country_code is not null
        group by country_code
        order by count(*) desc
        limit 15
      `,
    ),
    pool.query<{
      path: string;
      country_code: string | null;
      region: string | null;
      city: string | null;
      created_at: Date;
      user_id: string | null;
    }>(
      `
        select path, country_code, region, city, created_at, user_id
        from analytics_visits
        order by created_at desc
        limit 40
      `,
    ),
  ]);

  response.json({
    usersTotal: users.rows[0]?.c ?? 0,
    postsTotal: posts.rows[0]?.c ?? 0,
    visitsLast24h: visits24.rows[0]?.c ?? 0,
    visitsLast7d: visits7d.rows[0]?.c ?? 0,
    topCountries: topCountries.rows.map((r) => ({
      country: r.country_code,
      count: r.n,
    })),
    recentVisits: recent.rows.map((r) => ({
      path: r.path,
      countryCode: r.country_code,
      region: r.region,
      city: r.city,
      createdAt: r.created_at.toISOString(),
      userId: r.user_id,
    })),
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
  await pool.query(`update user_sessions set revoked_at = now() where user_id = $1 and revoked_at is null`, [
    idParse.data,
  ]);

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

const ipBanSchema = z.object({
  cidr: z.string().trim().min(3).max(64),
  reason: z.string().trim().max(500).optional(),
});

adminRouter.get('/ip-bans', async (_request, response) => {
  const r = await pool.query(
    `
      select b.id, b.cidr::text as cidr, b.reason, b.created_at, u.email as created_by_email
      from ip_bans b
      left join users u on u.id = b.created_by
      order by b.created_at desc
    `,
  );
  response.json({ ipBans: r.rows });
});

adminRouter.post('/ip-bans', async (request: AuthenticatedRequest, response) => {
  const parsed = ipBanSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: 'Datos invalidos.' });
    return;
  }
  try {
    const ins = await pool.query<{ id: string; cidr: string }>(
      `
        insert into ip_bans (cidr, reason, created_by)
        values ($1::cidr, $2, $3)
        returning id, cidr::text as cidr
      `,
      [parsed.data.cidr, parsed.data.reason ?? null, request.auth?.user.id ?? null],
    );
    response.status(201).json({ message: 'Rango bloqueado.', ban: ins.rows[0] });
  } catch {
    response.status(400).json({
      message: 'No se pudo guardar (usa CIDR valido, ej. 192.0.2.10/32 o 192.0.2.0/24).',
    });
  }
});

adminRouter.delete('/ip-bans/:banId', async (request, response) => {
  const idParse = z.string().uuid().safeParse(request.params.banId);
  if (!idParse.success) {
    response.status(400).json({ message: 'ID invalido.' });
    return;
  }
  await pool.query(`delete from ip_bans where id = $1`, [idParse.data]);
  response.json({ message: 'Bloqueo eliminado.' });
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
