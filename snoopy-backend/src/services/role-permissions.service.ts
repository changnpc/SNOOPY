import { findAll, appendRows, batchUpdateRows, getHeaders } from './google-sheets.service';
import { SHEETS } from '../config/sheets.config';

// Unique key for one role's permission on one resource.
function permKey(role: string, resource: string): string {
  return `${role}|${resource}`;
}

export type PermAction = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

export interface RolePermission {
  role: string;       // 'Coach' | 'Player'
  resource: string;   // 'athletes' | 'attendance' | 'leave' | 'calendar' | 'activities' | 'practice' | 'notifications' | 'teams'
  can_view: string;
  can_create: string;
  can_edit: string;
  can_delete: string;
}

export const RESOURCES = [
  { key: 'athletes',      label: 'โปรไฟล์นักกีฬา' },
  { key: 'attendance',    label: 'เช็กชื่อ' },
  { key: 'leave',         label: 'การลา' },
  { key: 'calendar',      label: 'ปฏิทิน' },
  { key: 'activities',    label: 'กิจกรรม' },
  { key: 'practice',      label: 'ลิงก์ซ้อม' },
  { key: 'notifications', label: 'การแจ้งเตือน' },
  { key: 'teams',         label: 'จัดการทีม' },
];

const MANAGED_ROLES = ['Coach', 'Player'];

// Default permissions if no row exists in Sheet yet
const DEFAULTS: Record<string, Record<string, Record<PermAction, boolean>>> = {
  Coach: {
    athletes:      { can_view: true,  can_create: false, can_edit: false, can_delete: false },
    attendance:    { can_view: true,  can_create: true,  can_edit: true,  can_delete: false },
    leave:         { can_view: true,  can_create: false, can_edit: false, can_delete: false },
    calendar:      { can_view: true,  can_create: true,  can_edit: true,  can_delete: true  },
    activities:    { can_view: true,  can_create: false, can_edit: false, can_delete: false },
    practice:      { can_view: true,  can_create: true,  can_edit: true,  can_delete: true  },
    notifications: { can_view: true,  can_create: false, can_edit: false, can_delete: false },
    teams:         { can_view: false, can_create: false, can_edit: false, can_delete: false },
  },
  Player: {
    athletes:      { can_view: true,  can_create: false, can_edit: false, can_delete: false },
    attendance:    { can_view: true,  can_create: false, can_edit: false, can_delete: false },
    leave:         { can_view: true,  can_create: true,  can_edit: false, can_delete: false },
    calendar:      { can_view: true,  can_create: false, can_edit: false, can_delete: false },
    activities:    { can_view: true,  can_create: false, can_edit: false, can_delete: false },
    practice:      { can_view: true,  can_create: false, can_edit: false, can_delete: false },
    notifications: { can_view: true,  can_create: false, can_edit: false, can_delete: false },
    teams:         { can_view: false, can_create: false, can_edit: false, can_delete: false },
  },
};

function toBool(val: string | boolean | undefined): boolean {
  if (typeof val === 'boolean') return val;
  return String(val).toUpperCase() === 'TRUE';
}

export async function getAllPermissions(): Promise<RolePermission[]> {
  const rows = await findAll<RolePermission>(SHEETS.ROLE_PERMISSIONS);
  // Index saved rows by role|resource for O(1) lookup.
  const saved = new Map<string, RolePermission>();
  for (const r of rows) saved.set(permKey(r.role, r.resource), r);

  // Fill in defaults for any missing role/resource combos
  const result: RolePermission[] = [];
  for (const role of MANAGED_ROLES) {
    for (const res of RESOURCES) {
      const existing = saved.get(permKey(role, res.key));
      if (existing) {
        result.push(existing);
      } else {
        const def = DEFAULTS[role]?.[res.key];
        result.push({
          role,
          resource: res.key,
          can_view:   String(def?.can_view   ?? false),
          can_create: String(def?.can_create ?? false),
          can_edit:   String(def?.can_edit   ?? false),
          can_delete: String(def?.can_delete ?? false),
        });
      }
    }
  }
  return result;
}

export async function savePermissions(updates: Array<{ role: string; resource: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>): Promise<void> {
  const rows = await findAll<RolePermission>(SHEETS.ROLE_PERMISSIONS);
  const headers = await getHeaders(SHEETS.ROLE_PERMISSIONS);

  // Index existing rows by role|resource → 1-based sheet row number.
  const rowByKey = new Map<string, number>();
  rows.forEach((r, i) => rowByKey.set(permKey(r.role, r.resource), i + 2)); // +2: skip header, 1-based

  const toUpdate: { rowIndex: number; row: string[] }[] = [];
  const toInsert: string[][] = [];

  for (const upd of updates) {
    const record: RolePermission = {
      role:       upd.role,
      resource:   upd.resource,
      can_view:   String(upd.can_view),
      can_create: String(upd.can_create),
      can_edit:   String(upd.can_edit),
      can_delete: String(upd.can_delete),
    };
    const rowData = headers.map(h => String((record as any)[h] ?? ''));
    const existingRow = rowByKey.get(permKey(upd.role, upd.resource));
    if (existingRow !== undefined) {
      toUpdate.push({ rowIndex: existingRow, row: rowData });
    } else {
      toInsert.push(rowData);
    }
  }

  // Two API calls total, regardless of how many permissions changed.
  await batchUpdateRows(SHEETS.ROLE_PERMISSIONS, toUpdate);
  await appendRows(SHEETS.ROLE_PERMISSIONS, toInsert);
}
