import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { findOne, updateRow, getHeaders } from './google-sheets.service';
import { SHEETS } from '../config/sheets.config';
import { User, JwtPayload, ok, fail } from '../models';
import { generateId } from '../utils/id-generator';
import { nowStr } from '../utils/date';

const oauthClient = new OAuth2Client(
  process.env['GOOGLE_CLIENT_ID'],
  process.env['GOOGLE_CLIENT_SECRET'],
  process.env['GOOGLE_REDIRECT_URI']
);

// ─── Exchange Google Code → Verify → JWT ────────────────────
export async function loginWithGoogleCode(code: string) {
  // 1. Exchange authorization code for tokens
  const { tokens } = await oauthClient.getToken(code);
  oauthClient.setCredentials(tokens);

  // 2. Verify ID token and extract user info
  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token!,
    audience: process.env['GOOGLE_CLIENT_ID'],
  });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error('No email in token');

  const { email, sub: googleSub } = payload;

  // 3. Look up user in Google Sheets
  const found = await findOne<User>(SHEETS.USERS, 'email', email);
  if (!found) {
    return fail('AUTH_ACCOUNT_NOT_FOUND', 'บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งานระบบ');
  }

  const user = found.data;
  if (user.is_active === false || String(user.is_active) === 'FALSE') {
    return fail('AUTH_ACCOUNT_INACTIVE', 'บัญชีนี้ถูกระงับการใช้งาน');
  }

  // 4. Issue JWT
  const jwtPayload: JwtPayload = {
    user_id: user.user_id,
    email:   user.email,
    role:    user.role,
    team_id: user.team_id || undefined,
  };

  const secret = process.env['JWT_SECRET']!;
  const expiresIn = (process.env['JWT_EXPIRES_IN'] ?? '8h') as jwt.SignOptions['expiresIn'];
  const token = jwt.sign(jwtPayload as object, secret, { expiresIn });

  // 5. Update last_login timestamp (fire-and-forget)
  try {
    const headers = await getHeaders(SHEETS.USERS);
    const updatedUser = { ...user, last_login: nowStr() };
    const row = headers.map(h => String((updatedUser as any)[h] ?? ''));
    await updateRow(SHEETS.USERS, found.rowIndex, row);
  } catch (_) { /* non-fatal */ }

  // 6. Return user + token (omit sensitive fields)
  const { phone, birth_date, google_sub, ...safeUser } = { ...user, last_login: nowStr() };
  return ok({ ...safeUser, token });
}

// ─── Verify JWT (used in middleware) ────────────────────────
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, process.env['JWT_SECRET']!) as JwtPayload;
}
