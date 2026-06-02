import { findAll, findOne, appendRow, updateRow, getHeaders } from './google-sheets.service';
import { SHEETS } from '../config/sheets.config';
import { JwtPayload } from '../models';
import { generateId } from '../utils/id-generator';
import { nowStr, todayStr } from '../utils/date';
import { createNotification } from './notifications.service';
import { deleteEventsByRefId, updateEventsByRefId } from './events.service';

export interface PracticeLink {
  link_id: string; practice_date: string; team_id: string;
  section: string; player_link: string; coach_link: string;
  note: string; is_archived: string; created_by: string;
  created_at: string; updated_at: string;
}

// ─── Get practice links (current or archived) ────────────────
export async function getPracticeLinks(
  requester: JwtPayload,
  archived = false
): Promise<PracticeLink[]> {
  let all = await findAll<PracticeLink>(SHEETS.PRACTICE_LINKS);
  const today = todayStr();
  // Treat past-date links as archived even if the cron hasn't run yet
  // (handles Railway cold-start / process restart that may skip the nightly cron).
  all = all.filter(l => {
    const isArchived = l.is_archived === 'TRUE' || l.practice_date < today;
    return isArchived === archived;
  });
  // RBAC: Coach/Player see only own team + All Teams (team_id = '')
  if (requester.role !== 'Super Admin') {
    all = all.filter(l => !l.team_id || l.team_id === requester.team_id);
  }
  // Mask coach_link for Players
  if (requester.role === 'Player') {
    all = all.map(l => ({ ...l, coach_link: '' }));
  }
  // Ascending: nearest upcoming date first, then section alphabetically.
  return all.sort((a, b) => {
    const dateCmp = a.practice_date.localeCompare(b.practice_date);
    return dateCmp !== 0 ? dateCmp : a.section.localeCompare(b.section);
  });
}

// ─── Create practice link (Super Admin) ──────────────────────
export async function createPracticeLink(
  data: { practice_date: string; team_id?: string; section: string; player_link: string; coach_link?: string; note?: string },
  createdBy: string
): Promise<PracticeLink> {
  // Unique check: (practice_date + team_id + section)
  const all = await findAll<PracticeLink>(SHEETS.PRACTICE_LINKS);
  const dup = all.find(l =>
    l.practice_date === data.practice_date &&
    (l.team_id ?? '') === (data.team_id ?? '') &&
    String(l.section) === String(data.section) &&
    l.is_archived !== 'TRUE'
  );
  if (dup) throw Object.assign(
    new Error(`มีลิงก์ Section ${data.section} ของทีมนี้ในวันนี้แล้ว`),
    { code: 'PRACTICE_LINK_DUPLICATE' }
  );

  const headers = await getHeaders(SHEETS.PRACTICE_LINKS);
  const link: PracticeLink = {
    link_id:       generateId('PL'),
    practice_date: data.practice_date,
    team_id:       data.team_id ?? '',
    section:       String(data.section),
    player_link:   data.player_link,
    coach_link:    data.coach_link ?? '',
    note:          data.note ?? '',
    is_archived:   'FALSE',
    created_by:    createdBy,
    created_at:    nowStr(),
    updated_at:    nowStr(),
  };
  const row = headers.map(h => String((link as any)[h] ?? ''));
  await appendRow(SHEETS.PRACTICE_LINKS, row);

  // Notify team (or all if no team)
  await createNotification({
    type: 'practice_new',
    title: 'ลิงก์ซ้อมใหม่',
    message: `ลิงก์ซ้อม Section ${data.section} วันที่ ${data.practice_date} พร้อมแล้ว`,
    ref_id: link.link_id,
    target_role: 'Player',
    target_team_id: data.team_id,
  });
  return link;
}

// ─── Update practice link ────────────────────────────────────
export async function updatePracticeLink(
  linkId: string,
  data: Partial<Pick<PracticeLink, 'practice_date' | 'section' | 'team_id' | 'player_link' | 'coach_link' | 'note'>>
): Promise<PracticeLink> {
  const found = await findOne<PracticeLink>(SHEETS.PRACTICE_LINKS, 'link_id', linkId);
  if (!found) throw Object.assign(new Error('ไม่พบ Practice Link'), { code: 'PRACTICE_LINK_NOT_FOUND' });
  if (found.data.is_archived === 'TRUE') {
    throw Object.assign(new Error('ไม่สามารถแก้ไข Link ที่ Archive แล้ว'), { code: 'PRACTICE_LINK_ARCHIVED' });
  }
  // Runtime whitelist — the type-level Pick doesn't strip extra body keys, so
  // guard link_id/is_archived/created_* from mass-assignment via raw req.body.
  const EDITABLE = ['practice_date', 'section', 'team_id', 'player_link', 'coach_link', 'note'] as const;
  const patch: Record<string, any> = {};
  for (const k of EDITABLE) if ((data as any)[k] !== undefined) patch[k] = (data as any)[k];

  const headers = await getHeaders(SHEETS.PRACTICE_LINKS);
  const updated = { ...found.data, ...patch, updated_at: nowStr() };
  const row = headers.map(h => String((updated as any)[h] ?? ''));
  await updateRow(SHEETS.PRACTICE_LINKS, found.rowIndex, row);

  // If the practice date or session name changed, sync linked calendar events.
  const dateChanged    = data.practice_date && data.practice_date !== found.data.practice_date;
  const sectionChanged = data.section       && data.section       !== found.data.section;
  if (dateChanged || sectionChanged) {
    const newDate    = updated.practice_date;
    const newSection = updated.section;
    const calPatch: Record<string, string> = {};
    if (dateChanged) {
      calPatch['start_datetime'] = `${newDate}T00:00:00`;
      calPatch['end_datetime']   = `${newDate}T00:00:00`;
    }
    if (sectionChanged || dateChanged) {
      // Rebuild the event title so it stays consistent (format: "ซ้อม ... (Section X)")
      calPatch['title'] = `ซ้อม${updated.team_id ? ' ' + updated.team_id : ''} (Section ${newSection})`;
    }
    await updateEventsByRefId(linkId, calPatch as any);
  }

  return updated;
}

// ─── Delete practice link ────────────────────────────────────
export async function deletePracticeLink(linkId: string): Promise<void> {
  const found = await findOne<PracticeLink>(SHEETS.PRACTICE_LINKS, 'link_id', linkId);
  if (!found) throw Object.assign(new Error('ไม่พบ Practice Link'), { code: 'PRACTICE_LINK_NOT_FOUND' });
  const headers = await getHeaders(SHEETS.PRACTICE_LINKS);
  const updated = { ...found.data, player_link: '[DELETED]', updated_at: nowStr() };
  const row = headers.map(h => String((updated as any)[h] ?? ''));
  await updateRow(SHEETS.PRACTICE_LINKS, found.rowIndex, row);
  // Cascade: soft-delete linked calendar events
  await deleteEventsByRefId(linkId);
}

// ─── Auto-archive expired links (called by Cron Job) ─────────
export async function archiveExpiredLinks(): Promise<number> {
  const today = todayStr();
  const all = await findAll<PracticeLink>(SHEETS.PRACTICE_LINKS);
  const headers = await getHeaders(SHEETS.PRACTICE_LINKS);
  let count = 0;

  for (let i = 0; i < all.length; i++) {
    const link = all[i];
    if (link.practice_date < today && link.is_archived !== 'TRUE') {
      const updated = { ...link, is_archived: 'TRUE', updated_at: nowStr() };
      const row = headers.map(h => String((updated as any)[h] ?? ''));
      await updateRow(SHEETS.PRACTICE_LINKS, i + 2, row); // +2 for header
      count++;
    }
  }
  console.log(`[CronJob] Archived ${count} expired practice links`);
  return count;
}
