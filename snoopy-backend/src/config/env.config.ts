/**
 * Centralised environment configuration + boot-time validation.
 *
 * Fails fast (process.exit) when a required variable is missing or unsafe,
 * so misconfiguration is caught at startup rather than at the first request.
 */

const isProd = (process.env['NODE_ENV'] ?? 'development') === 'production';

// Variables that MUST be present for the app to function.
const REQUIRED = [
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'GOOGLE_SHEETS_SPREADSHEET_ID',
] as const;

export function validateEnv(): void {
  const missing = REQUIRED.filter(k => !process.env[k] || process.env[k]!.trim() === '');
  if (missing.length > 0) {
    console.error(`❌ [ENV] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Service account key: must have at least one of the two forms.
  const hasKeyBase64 = !!process.env['GOOGLE_SERVICE_ACCOUNT_KEY_BASE64']?.trim();
  const hasKeyPath   = !!process.env['GOOGLE_SERVICE_ACCOUNT_KEY_PATH']?.trim();
  if (!hasKeyBase64 && !hasKeyPath) {
    console.error(
      '❌ [ENV] Google service account key not set. ' +
      'Provide GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 (Railway/cloud) or GOOGLE_SERVICE_ACCOUNT_KEY_PATH (local/Docker).'
    );
    process.exit(1);
  }

  // JWT secret must be strong enough to resist brute force.
  const secret = process.env['JWT_SECRET']!;
  if (secret.length < 32) {
    console.error('❌ [ENV] JWT_SECRET must be at least 32 characters long.');
    process.exit(1);
  }
  if (isProd && /your-super-secret|changeme|secret-key/i.test(secret)) {
    console.error('❌ [ENV] JWT_SECRET still looks like a placeholder. Set a real secret in production.');
    process.exit(1);
  }

  // In production CORS must be locked to a real origin, not localhost.
  if (isProd) {
    const origin = process.env['CORS_ORIGIN'] ?? '';
    if (!origin || origin.includes('localhost')) {
      console.warn('⚠️  [ENV] CORS_ORIGIN is empty or points to localhost in production. Set it to your real domain.');
    }
  }
}

export const env = {
  isProd,
  appName: 'SNOOPY',
  appVersion: process.env['APP_VERSION'] ?? '1.0.0',
  author: 'Nattapong PIMPISAN',
  authorEmail: 'pimpisan.cblt@gmail.com',
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  // Comma-separated list of allowed origins.
  corsOrigins: (process.env['CORS_ORIGIN'] ?? 'http://localhost:4200')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '60000', 10),
    max:      parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] ?? '300', 10),
    // Auth limit: strict in prod (20/min), relaxed in dev (200/min) so
    // repeated login tests during development don't hit 429.
    authMax:  parseInt(process.env['AUTH_RATE_LIMIT_MAX'] ?? (isProd ? '20' : '200'), 10),
  },
  // API docs are OFF by default; opt-in with ENABLE_API_DOCS=true.
  enableApiDocs: process.env['ENABLE_API_DOCS'] === 'true',
  // How many proxies sit in front of the app (nginx = 1).
  trustProxy: parseInt(process.env['TRUST_PROXY_HOPS'] ?? '1', 10),
};
