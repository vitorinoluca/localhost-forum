import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import geoip from 'geoip-lite';
import { z } from 'zod';
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
  const geo = geoip.lookup(ip);

  const countryCode = geo?.country ?? null;
  const region = geo?.region ?? null;
  const city = geo?.city ?? null;
  const ua = request.get('user-agent')?.slice(0, 512) ?? null;

  await pool.query(
    `
      insert into analytics_visits (path, referrer, country_code, region, city, user_agent, user_id)
      values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      parsed.data.path,
      parsed.data.referrer ?? null,
      countryCode,
      region,
      city,
      ua,
      request.auth?.user.id ?? null,
    ],
  );

  response.status(204).end();
});

export { analyticsRouter };
