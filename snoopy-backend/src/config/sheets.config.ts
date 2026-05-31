import { google } from 'googleapis';
import path from 'path';

export const SPREADSHEET_ID = () => process.env['GOOGLE_SHEETS_SPREADSHEET_ID'] ?? '';

export const SHEETS = {
  TEAMS:          'teams',
  USERS:          'users',
  ATTENDANCE:     'attendance',
  LEAVE_REQUESTS: 'leave_requests',
  EVENTS:         'events',
  ACTIVITIES:     'activities',
  PRACTICE_LINKS: 'practice_links',
  NOTIFICATIONS:       'notifications',
  AUDIT_LOG:           'audit_log',
  ROLE_PERMISSIONS:    'role_permissions',
} as const;

// ── Lazy initialization — only creates client when first API call is made ──
let _sheetsClient: ReturnType<typeof google.sheets> | null = null;
let _driveClient:  ReturnType<typeof google.drive>  | null = null;

/**
 * Build GoogleAuth from either:
 *   1. GOOGLE_SERVICE_ACCOUNT_KEY_BASE64  — base64-encoded JSON (Railway / cloud)
 *   2. GOOGLE_SERVICE_ACCOUNT_KEY_PATH    — path to JSON file (local / Docker)
 */
function getAuth() {
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ];

  const b64 = process.env['GOOGLE_SERVICE_ACCOUNT_KEY_BASE64'];
  if (b64) {
    const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    return new google.auth.GoogleAuth({ credentials, scopes });
  }

  const keyPath = process.env['GOOGLE_SERVICE_ACCOUNT_KEY_PATH'];
  if (keyPath) {
    return new google.auth.GoogleAuth({ keyFile: path.resolve(keyPath), scopes });
  }

  throw new Error(
    'Google service account key not configured. ' +
    'Set GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 (cloud) or GOOGLE_SERVICE_ACCOUNT_KEY_PATH (local).'
  );
}

export function getSheetsClient() {
  if (!_sheetsClient) _sheetsClient = google.sheets({ version: 'v4', auth: getAuth() });
  return _sheetsClient;
}

export function getDriveClient() {
  if (!_driveClient) _driveClient = google.drive({ version: 'v3', auth: getAuth() });
  return _driveClient;
}

// ── Convenience aliases (for backward-compat with existing imports) ──
export const sheetsClient = new Proxy({} as ReturnType<typeof google.sheets>, {
  get: (_t, prop) => (getSheetsClient() as any)[prop],
});
export const driveClient = new Proxy({} as ReturnType<typeof google.drive>, {
  get: (_t, prop) => (getDriveClient() as any)[prop],
});
