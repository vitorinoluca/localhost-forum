import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { URL } from 'node:url';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './db/pool.js';
import { authRouter } from './routes/auth.js';
import {
  buildAllowedOriginSet,
  normalizeBrowserOrigin,
} from './utils/cors-origins.js';
import { adminRouter } from './routes/admin.js';
import { forumRouter } from './routes/forum.js';
import { inboxRouter } from './routes/inbox.js';
import { notificationsRouter } from './routes/notifications.js';
import { sitemapRouter } from './routes/sitemap.js';
import { usersRouter } from './routes/users.js';
import { attachClientSpaIfPresent } from './serve-client.js';

export const app = express();

app.disable('x-powered-by');

const allowedOrigins = buildAllowedOriginSet(env.CLIENT_ORIGIN, env.CLIENT_ORIGINS);

if (env.NODE_ENV === 'production') {
  console.info(
    `[cors] Origenes permitidos (${allowedOrigins.size}): ${[...allowedOrigins].join(', ')}`,
  );
}

function isAllowedOrigin(origin: string) {
  const normalized = normalizeBrowserOrigin(origin);
  if (allowedOrigins.has(normalized)) {
    return true;
  }

  if (env.NODE_ENV !== 'production') {
    return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(normalized);
  }

  return false;
}

const corsOptions: cors.CorsOptions = {
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    if (process.env.CORS_LOG_REJECTS === 'true' || env.NODE_ENV !== 'production') {
      console.warn(`[cors] Origin rechazado: ${origin}`);
    }

    callback(null, false);
  },
};

app.set('trust proxy', env.TRUST_PROXY_HOPS === 0 ? false : env.TRUST_PROXY_HOPS);

function supabaseCspOrigin(): string | null {
  try {
    return new URL(env.SUPABASE_URL).origin;
  } catch {
    return null;
  }
}

const supabaseOrigin = supabaseCspOrigin();

const adSenseImg = [
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://www.google.com',
  'https://www.gstatic.com',
];
const adSenseFrame = [
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://www.google.com',
];
const adSenseConnect = [
  'https://pagead2.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://www.google.com',
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
];

const defaultCsp = helmet.contentSecurityPolicy.getDefaultDirectives();
const previousImg = defaultCsp['img-src'] ?? ["'self'", 'data:'];
const previousScript = defaultCsp['script-src'] ?? ["'self'"];
const previousStyle = defaultCsp['style-src'] ?? ["'self'", "'unsafe-inline'"];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...defaultCsp,
        'img-src': [...previousImg, 'blob:', ...adSenseImg, ...(supabaseOrigin ? [supabaseOrigin] : [])],
        'script-src': [
          ...previousScript,
          'https://accounts.google.com',
          'https://apis.google.com',
          'https://pagead2.googlesyndication.com',
          'https://www.googletagservices.com',
        ],
        'style-src': [...previousStyle, 'https://accounts.google.com'],
        'frame-src': ["'self'", 'https://accounts.google.com', ...adSenseFrame],
        'connect-src': [
          "'self'",
          'https://accounts.google.com',
          'https://www.googleapis.com',
          'https://oauth2.googleapis.com',
          ...adSenseConnect,
          ...(supabaseOrigin ? [supabaseOrigin] : []),
        ],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    strictTransportSecurity:
      env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
  }),
);

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/forum', forumRouter);
app.use('/api/admin', adminRouter);
app.use('/api/inbox', inboxRouter);
app.use('/api/notifications', notificationsRouter);

app.get('/api/health', async (_request, response) => {
  try {
    await checkDatabaseConnection();

    response.json({
      ok: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    response.status(503).json({
      ok: false,
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use(sitemapRouter);

attachClientSpaIfPresent(app, { explicitDistPath: env.CLIENT_DIST_PATH });

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next;

  if (response.headersSent) {
    return;
  }

  console.error(error);

  const message = error instanceof Error ? error.message : '';
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const isDatabaseConnectionError =
    ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'SELF_SIGNED_CERT_IN_CHAIN'].includes(code) ||
    ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'SELF_SIGNED_CERT_IN_CHAIN'].some((dbCode) =>
      message.includes(dbCode),
    ) ||
    message.includes('password authentication failed') ||
    message.includes('self-signed certificate');

  if (isDatabaseConnectionError) {
    response.status(503).json({
      message: 'No se pudo conectar con la base de datos. Revisa DATABASE_URL y DATABASE_SSL.',
    });
    return;
  }

  response.status(500).json({ message: 'Error interno del servidor.' });
};

app.use(errorHandler);
