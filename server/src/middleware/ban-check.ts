import type { NextFunction, Response } from 'express';
import { pool } from '../db/pool.js';
import { getClientIp } from '../utils/client-ip.js';

const EXEMPT_PATH_PREFIXES = ['/api/health', '/api/analytics/beacon', '/favicon.ico'];

function isExemptApiPath(urlPath: string): boolean {
  return EXEMPT_PATH_PREFIXES.some((p) => urlPath === p || urlPath.startsWith(`${p}/`));
}

export async function banCheckMiddleware(
  request: import('express').Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (request.method === 'OPTIONS') {
      next();
      return;
    }

    const path =
      (request.originalUrl?.split('?')[0] ?? `${request.baseUrl ?? ''}${request.path ?? ''}`) || '/';
    if (isExemptApiPath(path)) {
      next();
      return;
    }

    const ip = getClientIp(request);

    try {
      const ban = await pool.query<{ id: string; reason: string | null }>(
        `select id, reason from ip_bans where $1::inet <<= cidr limit 1`,
        [ip],
      );
      if (ban.rowCount) {
        response.status(403).json({
          message:
            ban.rows[0]?.reason?.trim() ?
              `Acceso denegado: ${ban.rows[0].reason}`
            : 'Acceso denegado desde esta direccion.',
        });
        return;
      }
    } catch {
      void undefined;
    }

    next();
  } catch (error) {
    next(error);
  }
}
