import argon2 from 'argon2';

const minLength = 8;

export function validatePasswordStrength(password: string) {
  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Minimo ${minLength} caracteres.`);
  }

  if (!/\d/.test(password)) {
    errors.push('Tiene que tener al menos un numero.');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Tiene que tener al menos un simbolo.');
  }

  return errors;
}

export function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 3,
    parallelism: 1,
  });
}

export function verifyPassword(hash: string | null | undefined, password: string) {
  if (!hash) return Promise.resolve(false);
  return argon2.verify(hash, password);
}
