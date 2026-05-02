import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './db/pool.js';
import { banCheckMiddleware } from './middleware/ban-check.js';
import { authRouter } from './routes/auth.js';
import { buildAllowedOriginSet } from './utils/cors-origins.js';
import { adminRouter } from './routes/admin.js';
import { analyticsRouter } from './routes/analytics.js';
import { forumRouter } from './routes/forum.js';
import { inboxRouter } from './routes/inbox.js';
import { notificationsRouter } from './routes/notifications.js';
import { usersRouter } from './routes/users.js';

export const app = express();

app.disable('x-powered-by');

const allowedOrigins = buildAllowedOriginSet(env.CLIENT_ORIGIN, process.env.CLIENT_ORIGINS);

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.has(origin)) {
    return true;
  }

  if (env.NODE_ENV !== 'production') {
    return /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin);
  }

  return false;
}

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
};

app.set('trust proxy', env.TRUST_PROXY_HOPS === 0 ? false : env.TRUST_PROXY_HOPS);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
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
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(banCheckMiddleware);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/forum', forumRouter);
app.use('/api/analytics', analyticsRouter);
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
