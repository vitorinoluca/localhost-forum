import crypto from 'node:crypto';
import { env } from '../config/env.js';

export function createVerificationCode() {
  return crypto.randomInt(100_000, 1_000_000).toString();
}

export function hashSecret(value: string) {
  return crypto.createHmac('sha256', env.SESSION_SECRET).update(value).digest('hex');
}

export function safeEqualHash(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
