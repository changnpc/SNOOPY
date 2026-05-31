import { findAll, readSheet, appendRow, appendRows, updateRow, batchUpdateRows } from './google-sheets.service';
import { SHEETS } from '../config/sheets.config';
import { AttendanceStatus, JwtPayload } from '../models';
import { generateId } from '../utils/id-generator';
import { nowStr } from '../utils/date';

export interface AttendanceRecord {
  attendance_id: string; date: string; player_id: string;
  team_id: string; status: AttendanceStatus; note: string;
  checked_by: string; checked_at: string; updated_at: string;
}

type AttendanceInput = { date: string; player_id: string; team_id: string; status: AttendanceStatus; note?: string };

// Unique key for one player's attendance on one date.
function attKey(date: string, playerId: string): string {
  return `${date}|${playerId}`;
}

// Order a record's fields to match the sheet's header columns.
function toSheetRow(headers: string[], record: AttendanceRecord): string[] {
  return headers.map(h => String((record as any)[h] ?? ''));
}

// ─── Get attendance for a specific date + team ───────────────
export async function getAttendanceByDate(
  date: string, teamId: string, requester: JwtPayload
): Promise<AttendanceRecord[]> {
  if (requester.role === 'Coach' && requester.team_id !== teamId) {
    throw Object.assign(new Error('RBAC_WRONG_TEAM'), { code: 'RBAC_WRONG_TEAM' });
  }
  const all = await findAll<AttendanceRecord>(SHEETS.ATTENDANCE);
  return all.filter(r => r.date === date && r.team_id === teamId);
}

// ─── Get own attendance (Player) ─────────────────────────────
export async function getMyAttendance(playerId: string): Promise<AttendanceRecord[]> {
  const all = await findAll<AttendanceRecord>(SHEETS.ATTENDANCE);
  return all.filter(r => r.player_id === playerId)
            .sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Upsert one attendance record ────────────────────────────
export async function upsertAttendance(
  data: AttendanceInput,
  checkedBy: string,
  requester: JwtPayload
): Promise<AttendanceRecord> {
  // RBAC: Coach only own team
  if (requester.role === 'Coach' && requester.team_id !== data.team_id) {
    throw Object.assign(new Error('RBAC_WRONG_TEAM'), { code: 'RBAC_WRONG_TEAM' });
  }

  // Read the sheet once, then decide insert vs update in memory.
  const sheet = await readSheet(SHEETS.ATTENDANCE);
  const headers = (sheet[0] ?? []) as string[];
  const rows = sheet.slice(1) as string[][];

  const dateCol = headers.indexOf('date');
  const playerCol = headers.indexOf('player_id');
  const existingIdx = rows.findIndex(
    r => r[dateCol] === data.date && r[playerCol] === data.player_id
  );

  if (existingIdx !== -1) {
    const current = rowToRecord(headers, rows[existingIdx]);
    const updated: AttendanceRecord = {
      ...current,
      status:     data.status,
      note:       data.note ?? current.note,
      checked_by: checkedBy,
      updated_at: nowStr(),
    };
    await updateRow(SHEETS.ATTENDANCE, existingIdx + 2, toSheetRow(headers, updated));
    return updated;
  }

  const record = newRecord(data, checkedBy);
  await appendRow(SHEETS.ATTENDANCE, toSheetRow(headers, record));
  return record;
}

// ─── Batch upsert for a whole team (single read, batched writes) ──
export async function batchUpsertAttendance(
  records: AttendanceInput[],
  checkedBy: string,
  requester: JwtPayload
): Promise<void> {
  if (records.length === 0) return;

  // RBAC: a Coach may only submit for their own team.
  if (requester.role === 'Coach') {
    const wrongTeam = records.some(r => r.team_id !== requester.team_id);
    if (wrongTeam) {
      throw Object.assign(new Error('RBAC_WRONG_TEAM'), { code: 'RBAC_WRONG_TEAM' });
    }
  }

  // Read the attendance sheet ONCE.
  const sheet = await readSheet(SHEETS.ATTENDANCE);
  const headers = (sheet[0] ?? []) as string[];
  const rows = sheet.slice(1) as string[][];
  const dateCol = headers.indexOf('date');
  const playerCol = headers.indexOf('player_id');

  // Index existing rows by date|player_id → 1-based sheet row number.
  const rowByKey = new Map<string, number>();
  rows.forEach((r, i) => {
    rowByKey.set(attKey(r[dateCol], r[playerCol]), i + 2); // +2: skip header, 1-based
  });

  const updates: { rowIndex: number; row: string[] }[] = [];
  const inserts: string[][] = [];

  for (const data of records) {
    const key = attKey(data.date, data.player_id);
    const existingRow = rowByKey.get(key);
    if (existingRow !== undefined) {
      const current = rowToRecord(headers, rows[existingRow - 2]);
      const updated: AttendanceRecord = {
        ...current,
        status:     data.status,
        note:       data.note ?? current.note,
        checked_by: checkedBy,
        updated_at: nowStr(),
      };
      updates.push({ rowIndex: existingRow, row: toSheetRow(headers, updated) });
    } else {
      inserts.push(toSheetRow(headers, newRecord(data, checkedBy)));
    }
  }

  // Two API calls total, regardless of how many players.
  await batchUpdateRows(SHEETS.ATTENDANCE, updates);
  await appendRows(SHEETS.ATTENDANCE, inserts);
}

// ─── helpers ─────────────────────────────────────────────────
function rowToRecord(headers: string[], row: string[]): AttendanceRecord {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
  return obj as unknown as AttendanceRecord;
}

function newRecord(data: AttendanceInput, checkedBy: string): AttendanceRecord {
  const now = nowStr();
  return {
    attendance_id: generateId('ATT'),
    date:          data.date,
    player_id:     data.player_id,
    team_id:       data.team_id,
    status:        data.status,
    note:          data.note ?? '',
    checked_by:    checkedBy,
    checked_at:    now,
    updated_at:    now,
  };
}

// ─── Attendance history (with filters) ───────────────────────
export async function getAttendanceHistory(
  requester: JwtPayload,
  filter?: { team_id?: string; date_from?: string; date_to?: string; player_id?: string }
): Promise<AttendanceRecord[]> {
  let all = await findAll<AttendanceRecord>(SHEETS.ATTENDANCE);

  if (requester.role === 'Coach') {
    all = all.filter(r => r.team_id === requester.team_id);
  } else if (filter?.team_id) {
    all = all.filter(r => r.team_id === filter.team_id);
  }
  if (filter?.player_id) all = all.filter(r => r.player_id === filter.player_id);
  if (filter?.date_from)  all = all.filter(r => r.date >= filter.date_from!);
  if (filter?.date_to)    all = all.filter(r => r.date <= filter.date_to!);

  return all.sort((a, b) => b.date.localeCompare(a.date));
}
