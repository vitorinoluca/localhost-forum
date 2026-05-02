import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const inboxRouter = Router();

inboxRouter.get('/summary', requireAuth, async (request: AuthenticatedRequest, response) => {
  const userId = request.auth?.user.id;
  if (!userId) {
    response.status(401).json({ message: 'No autenticado.' });
    return;
  }

  const notifications = await pool.query<{ c: number }>(
    `select count(*)::int as c from notifications where user_id = $1 and read_at is null`,
    [userId],
  );

  response.json({
    notificationsUnread: notifications.rows[0]?.c ?? 0,
  });
});

export { inboxRouter };
