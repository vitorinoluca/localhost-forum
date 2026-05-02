import type { Request } from 'express';

export function getClientIp(request: Request): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return normalizeIp(first);
  }
  const socketIp = request.socket.remoteAddress;
  if (socketIp) return normalizeIp(socketIp);
  return '127.0.0.1';
}

function normalizeIp(raw: string): string {
  if (raw.startsWith('::ffff:')) {
    return raw.slice('::ffff:'.length);
  }
  return raw;
}
