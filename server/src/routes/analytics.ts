import { isIP } from 'node:net';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import geoip from 'geoip-lite';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { optionalAuth } from '../middleware/auth.js';
import { getClientIp } from '../utils/client-ip.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const analyticsRouter = Router();

const beaconLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const beaconSchema = z.object({
  path: z.string().trim().min(1).max(512),
  referrer: z.string().trim().max(1024).optional(),
});

analyticsRouter.post('/beacon', beaconLimiter, optionalAuth, async (request: AuthenticatedRequest, response) => {
  const parsed = beaconSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: 'Datos invalidos.' });
    return;
  }

  const ip = getClientIp(request);
  const inetOk = isIP(ip) !== 0;

  if (inetOk && env.ANALYTICS_IP_DEDUPE_HOURS > 0) {
    const dup = await pool.query<{ ok: number }>(
      `
        select 1 as ok
        from analytics_visits
        where client_ip = $1::inet
          and created_at > now() - ($2::int * interval '1 hour')
        limit 1
      `,
      [ip, env.ANALYTICS_IP_DEDUPE_HOURS],
    );
    if (dup.rows.length > 0) {
      response.status(204).end();
      return;
    }
  }

  const geo = geoip.lookup(ip);

  const countryCode = geo?.country ?? null;
  const region = geo?.region ?? null;
  const city = geo?.city ?? null;
  const ua = request.get('user-agent')?.slice(0, 512) ?? null;
  const clientIp = inetOk ? ip : null;

  await pool.query(
    `
      insert into analytics_visits (path, referrer, country_code, region, city, user_agent, user_id, client_ip)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      parsed.data.path,
      parsed.data.referrer ?? null,
      countryCode,
      region,
      city,
      ua,
      request.auth?.user.id ?? null,
      clientIp,
    ],
  );

  response.status(204).end();
});

export { analyticsRouter };
