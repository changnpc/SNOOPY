import { findAll, findOne, appendRow, updateRow, getHeaders, invalidateCache } from './google-sheets.service';
import { SHEETS } from '../config/sheets.config';
import { User, UserRole, JwtPayload } from '../models';
import { generateId } from '../utils/id-generator';
import { nowStr } from '../utils/date';

// ─── Field masks per role ────────────────────────────────────
function maskUser(user: User, requester: JwtPayload): User {
  const isAdmin  = requester.role === 'Super Admin';
  const isOwner  = requester.user_id === user.user_id;
  const isSameTeamCoach = requester.role === 'Coach' && requester.team_id === user.team_id;

  const masked = { ...user };
  if (!isAdmin && !isOwner) delete masked.birth_date;
  if (!isAdmin && !isOwner && !isSameTeamCoach) delete masked.phone;
  delete masked.google_sub; // never expose
  return masked;
}

// ─── Get all users (with optional filters) ───────────────────
export async function getAllUsers(
  requester: JwtPayload,
  filter?: { team_id?: string; sub_team_id?: string; role?: UserRole; is_active?: string }
): Promise<User[]> {
  let users = await findAll<User>(SHEETS.USERS);
  // All roles see all users; apply optional team filter if provided
  if (filter?.team_id) {
    users = users.filter(u => u.team_id === filter.team_id);
  }
  // Optional sub-team filter (Admin or Coach within their team)
  if (filter?.sub_team_id) {
    users = users.filter(u => u.sub_team_id === filter.sub_team_id);
  }
  if (filter?.role)      users = users.filter(u => u.role === filter.role);
  if (filter?.is_active !== undefined) {
    const active = filter.is_active === 'true' || filter.is_active === 'TRUE';
    users = users.filter(u => (String(u.is_active).toUpperCase() === 'TRUE') === active);
  }
  return users.map(u => maskUser(u, requester));
}

// ─── Get single user ─────────────────────────────────────────
export async function getUserById(userId: string, requester: JwtPayload): Promise<User | null> {
  const found = await findOne<User>(SHEETS.USERS, 'user_id', userId);
  if (!found) return null;
  return maskUser(found.data, requester);
}

// ─── Create user (Super Admin only) ──────────────────────────
export async function createUser(
  data: Omit<User, 'user_id' | 'created_at' | 'updated_at'>,
  createdBy: string
): Promise<User> {
  // Check email uniqueness
  const existing = await findOne<User>(SHEETS.USERS, 'email', data.email);
  if (existing) throw Object.assign(new Error('Email already exists'), { code: 'EMAIL_DUPLICATE' });

  const headers = await getHeaders(SHEETS.USERS);
  const user: User = {
    ...data,
    user_id:    generateId('U'),
    is_active:  true,
    created_at: nowStr(),
    updated_at: nowStr(),
    created_by: createdBy,
  };
  const row = headers.map(h => String((user as any)[h] ?? ''));
  await appendRow(SHEETS.USERS, row);
  return user;
}

// ─── Update user ──────────────────────────────────────────────
export async function updateUser(
  userId: string,
  data: Partial<User>,
  requester: JwtPayload
): Promise<User> {
  const found = await findOne<User>(SHEETS.USERS, 'user_id', userId);
  if (!found) throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });

  const isAdmin = requester.role === 'Super Admin';
  const isCoach = requester.role === 'Coach';
  const isOwner = requester.user_id === userId;
  const isSameTeamCoach = isCoach && requester.team_id === found.data.team_id;

  // Normalize: treat string "null" or "" as clearing the field
  const normalize = (v: any) => (v === 'null' || v === '') ? undefined : v;
  if ((data as any).team_id !== undefined)     (data as any).team_id     = normalize((data as any).team_id);
  if ((data as any).sub_team_id !== undefined) (data as any).sub_team_id = normalize((data as any).sub_team_id);

  // Players can only update: img_avatar_url, phone, email
  const allowedForPlayer = ['img_avatar_url', 'phone', 'email'] as const;
  // Coach can update: sub_team_id (only for players in their own team)
  const allowedForCoach  = ['sub_team_id'] as const;
  let updateData: Partial<User> = isAdmin ? data : {};
  if (isOwner && !isAdmin) {
    allowedForPlayer.forEach(field => {
      if ((data as any)[field] !== undefined) (updateData as any)[field] = (data as any)[field];
    });
  }
  if (isSameTeamCoach && !isAdmin) {
    allowedForCoach.forEach(field => {
      if ((data as any)[field] !== undefined) (updateData as any)[field] = (data as any)[field];
    });
  }

  const headers = await getHeaders(SHEETS.USERS);
  const updated: User = { ...found.data, ...updateData, updated_at: nowStr() };
  const row = headers.map(h => String((updated as any)[h] ?? ''));
  await updateRow(SHEETS.USERS, found.rowIndex, row);
  return maskUser(updated, requester);
}

// ─── Deactivate (Soft Delete) ────────────────────────────────
export async function deactivateUser(userId: string): Promise<void> {
  const found = await findOne<User>(SHEETS.USERS, 'user_id', userId);
  if (!found) throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });
  const headers = await getHeaders(SHEETS.USERS);
  const updated: User = { ...found.data, is_active: false, updated_at: nowStr() };
  const row = headers.map(h => String((updated as any)[h] ?? ''));
  await updateRow(SHEETS.USERS, found.rowIndex, row);
}

// ─── Reactivate ──────────────────────────────────────────────
export async function reactivateUser(userId: string): Promise<void> {
  const found = await findOne<User>(SHEETS.USERS, 'user_id', userId);
  if (!found) throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });
  const headers = await getHeaders(SHEETS.USERS);
  const updated: User = { ...found.data, is_active: true, updated_at: nowStr() };
  const row = headers.map(h => String((updated as any)[h] ?? ''));
  await updateRow(SHEETS.USERS, found.rowIndex, row);
}
