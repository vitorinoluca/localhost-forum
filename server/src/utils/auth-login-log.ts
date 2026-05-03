import type { Request } from 'express';
import { env } from '../config/env.js';

export function authLoginLog(
  event: string,
  request: Request,
  fields?: Record<string, string | number | boolean | undefined>,
) {
  if (!env.AUTH_LOGIN_LOG) return;
  console.info(`[auth] ${event}`, {
    ip: request.ip,
    ...fields,
  });
}
