export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
  bio: string | null;
  avatarUrl: string | null;
  role: 'user' | 'superadmin';
};

type ApiResponse<T> = T & {
  message?: string;
  status?: string;
  nextPath?: string;
  emailMasked?: string;
  devCode?: string;
};

function vitePublicBase(): string {
  const raw = import.meta.env.BASE_URL ?? '/';
  if (raw === '/') return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function normalizeViteApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return raw;
  console.warn(
    '[api] VITE_API_URL debe estar vacío, ser https://… o empezar con /. Ignorando:',
    raw,
  );
  return '';
}

const apiBaseNormalized = normalizeViteApiBase();

export class ApiError extends Error {
  statusCode: number;
  data: unknown;

  constructor(message: string, statusCode: number, data: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const pathname = path.startsWith('/') ? path : `/${path}`;

  if (/^https?:\/\//i.test(apiBaseNormalized)) {
    return `${apiBaseNormalized.replace(/\/$/, '')}${pathname}`;
  }

  const pathPrefix = apiBaseNormalized.startsWith('/') ? apiBaseNormalized.replace(/\/$/, '') : '';
  const pub = vitePublicBase();
  const joined = `${pub}${pathPrefix}${pathname}`.replace(/\/{2,}/g, '/');
  return joined.startsWith('/') ? joined : `/${joined}`;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers: isFormData
      ? options.headers
      : {
          'Content-Type': 'application/json',
          ...options.headers,
        },
  });

  const data = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiError(data.message ?? 'No se pudo completar la solicitud.', response.status, data);
  }

  return data;
}
