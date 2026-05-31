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

function getAuth() {
  const keyPath = process.env['GOOGLE_SERVICE_ACCOUNT_KEY_PATH'];
  if (!keyPath) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set in .env');
  }
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(keyPath),
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
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
