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

/** Vacío = mismo origen que la página (producción con Express sirviendo el SPA). Desarrollo: proxy /api en Vite. */
const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  statusCode: number;
  data: unknown;

  constructor(message: string, statusCode: number, data: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
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
