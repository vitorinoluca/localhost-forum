import type { NextFunction, Response } from 'express';
import { env } from '../config/env.js';
import { loadSessionFromToken } from '../services/session-auth.js';
import type { AuthenticatedRequest } from '../types/auth.js';

export async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) {
  const auth = await loadSessionFromToken(request.cookies?.[env.SESSION_COOKIE_NAME]);
  if (!auth) {
    response.status(401).json({ message: 'No autenticado.' });
    return;
  }
  request.auth = auth;
  next();
}

export async function optionalAuth(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
) {
  const auth = await loadSessionFromToken(request.cookies?.[env.SESSION_COOKIE_NAME]);
  if (auth) request.auth = auth;
  next();
}
