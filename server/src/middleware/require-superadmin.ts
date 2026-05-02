import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../types/auth.js';

export function requireSuperadmin(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const role = request.auth?.user.role;
  if (role !== 'superadmin') {
    response.status(403).json({ message: 'Se requieren permisos de administracion.' });
    return;
  }
  next();
}
