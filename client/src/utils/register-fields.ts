export type RegisterFieldErrorsState = {
  name: boolean;
  email: boolean;
  password: boolean;
};

export function emptyRegisterFieldErrors(): RegisterFieldErrorsState {
  return { name: false, email: false, password: false };
}

export function parseRegisterFields(data: unknown): RegisterFieldErrorsState {
  const out = emptyRegisterFieldErrors();
  if (!data || typeof data !== 'object') return out;
  const raw = (data as { fields?: unknown }).fields;
  if (!raw || typeof raw !== 'object') return out;
  const keys = ['name', 'email', 'password'] as const;
  for (const key of keys) {
    const arr = (raw as Record<string, unknown>)[key];
    out[key] = Array.isArray(arr) && arr.length > 0;
  }
  return out;
}
