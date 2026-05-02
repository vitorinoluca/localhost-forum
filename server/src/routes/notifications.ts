import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, async (request: AuthenticatedRequest, response) => {
  const userId = request.auth?.user.id;
  if (!userId) {
    response.status(401).json({ message: 'No autenticado.' });
    return;
  }

  const result = await pool.query<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    link_path: string;
    read_at: Date | null;
    created_at: Date;
    actor_name: string | null;
    actor_avatar_url: string | null;
    actor_user_id: string | null;
    post_id: string | null;
  }>(
    `
      select
        n.id,
        n.type,
        n.title,
        n.body,
        n.link_path,
        n.read_at,
        n.created_at,
        n.actor_user_id,
        n.post_id,
        u.name as actor_name,
        u.avatar_url as actor_avatar_url
      from notifications n
      left join users u on u.id = n.actor_user_id
      where n.user_id = $1
      order by n.created_at desc
      limit 80
    `,
    [userId],
  );

  response.json({
    notifications: result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      linkPath: row.link_path,
      readAt: row.read_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
      postId: row.post_id,
      actor: row.actor_user_id
        ? {
            id: row.actor_user_id,
            name: row.actor_name ?? '',
            avatarUrl: row.actor_avatar_url,
          }
        : null,
    })),
  });
});

notificationsRouter.post('/read-all', requireAuth, async (request: AuthenticatedRequest, response) => {
  const userId = request.auth?.user.id;
  if (!userId) {
    response.status(401).json({ message: 'No autenticado.' });
    return;
  }

  await pool.query(
    `update notifications set read_at = now() where user_id = $1 and read_at is null`,
    [userId],
  );

  response.json({ message: 'OK.' });
});

notificationsRouter.post('/:notificationId/read', requireAuth, async (request: AuthenticatedRequest, response) => {
  const userId = request.auth?.user.id;
  const parsed = z.string().uuid().safeParse(request.params.notificationId);
  if (!userId || !parsed.success) {
    response.status(400).json({ message: 'Solicitud invalida.' });
    return;
  }

  const updated = await pool.query(
    `
      update notifications
      set read_at = now()
      where id = $1 and user_id = $2 and read_at is null
      returning id
    `,
    [parsed.data, userId],
  );

  if (!updated.rowCount) {
    response.status(404).json({ message: 'Notificacion no encontrada.' });
    return;
  }

  response.json({ message: 'OK.' });
});

export { notificationsRouter };
