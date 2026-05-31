import { findAll, appendRow, updateRow, getHeaders, findOne } from './google-sheets.service';
import { SHEETS } from '../config/sheets.config';
import { NotificationType } from '../models';
import { generateId } from '../utils/id-generator';
import { nowStr } from '../utils/date';

export interface NotificationRecord {
  notification_id: string; user_id: string; type: NotificationType;
  title: string; message: string; ref_id: string; is_read: string; created_at: string;
}

interface CreateNotifOptions {
  type: NotificationType;
  title: string;
  message: string;
  ref_id?: string;
  target_user_id?: string;    // notify specific user
  target_role?: string;       // notify all users with this role
  target_team_id?: string;    // combined with target_role
}

export async function createNotification(opts: CreateNotifOptions): Promise<void> {
  const headers = await getHeaders(SHEETS.NOTIFICATIONS);
  const recipients: string[] = [];

  if (opts.target_user_id) {
    recipients.push(opts.target_user_id);
  } else if (opts.target_role) {
    const { findMany } = await import('./google-sheets.service');
    const filter: Record<string, string> = { role: opts.target_role, is_active: 'TRUE' };
    const users = await findMany<{ user_id: string; team_id: string }>(SHEETS.USERS, filter);
    users.forEach(u => {
      if (!opts.target_team_id || u.team_id === opts.target_team_id) {
        recipients.push(u.user_id);
      }
    });
    // Also notify Super Admins
    const admins = await findMany<{ user_id: string }>(SHEETS.USERS, { role: 'Super Admin', is_active: 'TRUE' });
    admins.forEach(a => { if (!recipients.includes(a.user_id)) recipients.push(a.user_id); });
  }

  for (const userId of recipients) {
    const notif: NotificationRecord = {
      notification_id: generateId('NOTI'),
      user_id:   userId,
      type:      opts.type,
      title:     opts.title,
      message:   opts.message,
      ref_id:    opts.ref_id ?? '',
      is_read:   'FALSE',
      created_at: nowStr(),
    };
    const row = headers.map(h => String((notif as any)[h] ?? ''));
    await appendRow(SHEETS.NOTIFICATIONS, row);
  }
}

export async function getMyNotifications(userId: string): Promise<NotificationRecord[]> {
  const all = await findAll<NotificationRecord>(SHEETS.NOTIFICATIONS);
  return all.filter(n => n.user_id === userId)
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 50);
}

export async function markAsRead(notifId: string, userId: string): Promise<void> {
  const found = await findOne<NotificationRecord>(SHEETS.NOTIFICATIONS, 'notification_id', notifId);
  if (!found || found.data.user_id !== userId) return;
  const headers = await getHeaders(SHEETS.NOTIFICATIONS);
  const updated = { ...found.data, is_read: 'TRUE' };
  const row = headers.map(h => String((updated as any)[h] ?? ''));
  await updateRow(SHEETS.NOTIFICATIONS, found.rowIndex, row);
}

export async function markAllRead(userId: string): Promise<void> {
  const all = await findAll<NotificationRecord>(SHEETS.NOTIFICATIONS);
  const headers = await getHeaders(SHEETS.NOTIFICATIONS);
  const unread = all.map((n, i) => ({ n, rowIndex: i + 2 }))
                    .filter(({ n }) => n.user_id === userId && n.is_read !== 'TRUE');
  for (const { n, rowIndex } of unread) {
    const updated = { ...n, is_read: 'TRUE' };
    const row = headers.map(h => String((updated as any)[h] ?? ''));
    await updateRow(SHEETS.NOTIFICATIONS, rowIndex, row);
  }
}

export async function deleteNotification(notifId: string, userId: string): Promise<void> {
  const found = await findOne<NotificationRecord>(SHEETS.NOTIFICATIONS, 'notification_id', notifId);
  if (!found || found.data.user_id !== userId) return;
  const headers = await getHeaders(SHEETS.NOTIFICATIONS);
  const updated = { ...found.data, title: '[DELETED]' };
  const row = headers.map(h => String((updated as any)[h] ?? ''));
  await updateRow(SHEETS.NOTIFICATIONS, found.rowIndex, row);
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const all = await findAll<NotificationRecord>(SHEETS.NOTIFICATIONS);
  const headers = await getHeaders(SHEETS.NOTIFICATIONS);
  const mine = all.map((n, i) => ({ n, rowIndex: i + 2 }))
                  .filter(({ n }) => n.user_id === userId && n.title !== '[DELETED]');
  for (const { n, rowIndex } of mine) {
    const updated = { ...n, title: '[DELETED]' };
    const row = headers.map(h => String((updated as any)[h] ?? ''));
    await updateRow(SHEETS.NOTIFICATIONS, rowIndex, row);
  }
}
