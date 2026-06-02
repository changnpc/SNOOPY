import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config';
import { env, validateEnv } from './config/env.config';

import authRoutes         from './routes/auth.routes';
import teamsRoutes        from './routes/teams.routes';
import usersRoutes        from './routes/users.routes';
import attendanceRoutes   from './routes/attendance.routes';
import leaveRoutes        from './routes/leave.routes';
import eventsRoutes       from './routes/events.routes';
import activitiesRoutes   from './routes/activities.routes';
import practiceRoutes     from './routes/practice.routes';
import notificationsRoutes   from './routes/notifications.routes';
import rolePermissionsRoutes from './routes/role-permissions.routes';
import competitionsRoutes    from './routes/competitions.routes';
import dashboardRoutes       from './routes/dashboard.routes';

// ── Fail fast on bad configuration ────────────────────────
validateEnv();

const app = express();

// Behind nginx/reverse proxy: trust the first hop so express-rate-limit and
// req.ip see the REAL client IP (via X-Forwarded-For) instead of the proxy's.
// Without this, 50 users behind one proxy share a single rate-limit bucket.
app.set('trust proxy', env.trustProxy);

// ── Security & Middleware ─────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: env.isProd ? undefined : false,
  hsts: env.isProd ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
}));

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin / server-to-server (no Origin header) and whitelisted origins.
    if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(compression());
app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health Check (before rate limiting — never throttle probes) ──
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: env.appName,
    version: env.appVersion,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Rate Limiting ─────────────────────────────────────────
// General API limit — per client IP (works correctly thanks to trust proxy).
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'คำขอมากเกินไป กรุณาลองใหม่ในอีกสักครู่' } },
});
app.use('/api/', apiLimiter);

// Stricter limit on auth endpoints to slow credential-stuffing / token abuse.
const authLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่' } },
});
app.use('/api/auth', authLimiter);

// ── Swagger UI (opt-in; OFF by default in production) ──────
if (env.enableApiDocs) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'SNOOPY API Docs',
    swaggerOptions: { persistAuthorization: true },
  }));
  app.get('/api/docs.json', (_req, res) => { res.json(swaggerSpec); });
  console.log('📚 API docs enabled at /api/docs');
}

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/teams',          teamsRoutes);
app.use('/api/users',          usersRoutes);
app.use('/api/attendance',     attendanceRoutes);
app.use('/api/leave-requests', leaveRoutes);
app.use('/api/events',         eventsRoutes);
app.use('/api/activities',     activitiesRoutes);
app.use('/api/practice-links', practiceRoutes);
app.use('/api/notifications',    notificationsRoutes);
app.use('/api/role-permissions', rolePermissionsRoutes);
app.use('/api/competitions',    competitionsRoutes);
app.use('/api/dashboard',       dashboardRoutes);

// ── 404 Handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// ── Global Error Handler ──────────────────────────────────
// Catches anything thrown/next(err)'d downstream. Never leaks stack traces
// to clients in production; logs full detail server-side.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.statusCode || err?.status || 500;
  const code   = err?.code || 'INTERNAL_ERROR';

  if (err?.message === 'Not allowed by CORS') {
    res.status(403).json({ success: false, error: { code: 'CORS_FORBIDDEN', message: 'Origin not allowed' } });
    return;
  }

  console.error('[ERROR]', status, code, err?.message ?? err, env.isProd ? '' : (err?.stack ?? ''));

  res.status(status).json({
    success: false,
    error: {
      code,
      message: env.isProd ? 'เกิดข้อผิดพลาดภายในระบบ' : (err?.message ?? 'Internal error'),
    },
  });
});

// ── Start ─────────────────────────────────────────────────
const server = app.listen(env.port, () => {
  console.log(`🚀 ${env.appName} Backend v${env.appVersion} running on port ${env.port} [${env.isProd ? 'production' : 'development'}]`);
});

// Graceful shutdown so in-flight requests finish during deploys/restarts.
function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => { console.log('HTTP server closed.'); process.exit(0); });
  // Force-exit if connections hang.
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export default app;

// ── Start Cron Jobs ───────────────────────────────────────
import('./jobs/archive-practice-links.job').then(({ startArchiveCronJob }) => {
  startArchiveCronJob();
});

// Run archive once at startup to catch any links that expired while the
// server was down (Railway sleep / cold-start / missed cron window).
import('./services/practice.service').then(({ archiveExpiredLinks }) => {
  archiveExpiredLinks()
    .then(n => { if (n > 0) console.log(`[Startup] Archived ${n} expired practice links`); })
    .catch(err => console.warn('[Startup] archive failed:', err));
});
import('./services/activities.service').then(({ archiveExpiredActivities }) => {
  archiveExpiredActivities()
    .then(n => { if (n > 0) console.log(`[Startup] Archived ${n} expired activities`); })
    .catch(err => console.warn('[Startup] archive failed:', err));
});
