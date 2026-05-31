import { findAll, getHeaders, batchUpdateRows } from './google-sheets.service';
import { SHEETS } from '../config/sheets.config';
import { JwtPayload } from '../models';
import { nowStr } from '../utils/date';
import { SheetRepository, TombstoneTitle } from './base/sheet-repository';

export interface CalendarEvent {
  event_id: string; title: string; description: string;
  start_datetime: string; end_datetime: string; is_all_day: string;
  color: string; team_id: string; created_by: string;
  ref_id: string;   // links to activity_id or link_id; empty = standalone event
  created_at: string; updated_at: string;
}

const repo = new SheetRepository<CalendarEvent>(SHEETS.EVENTS, 'event_id', 'EVT', 'EVENT_NOT_FOUND', 'ไม่พบกิจกรรม');

export async function getEvents(requester: JwtPayload, filter?: { date_from?: string; date_to?: string }): Promise<CalendarEvent[]> {
  let all = await repo.findAll();
  // Filter: show events for user's team OR all-team events
  if (requester.role !== 'Super Admin') {
    all = all.filter(e => !e.team_id || e.team_id === requester.team_id);
  }
  if (filter?.date_from) all = all.filter(e => e.start_datetime >= filter.date_from!);
  if (filter?.date_to)   all = all.filter(e => e.start_datetime <= filter.date_to! + 'T23:59:59');
  return all.sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
}

export async function createEvent(data: Partial<CalendarEvent>, createdBy: string): Promise<CalendarEvent> {
  const event: CalendarEvent = {
    event_id:       repo.newId(),
    title:          data.title!,
    description:    data.description ?? '',
    start_datetime: data.start_datetime!,
    end_datetime:   data.end_datetime!,
    is_all_day:     data.is_all_day ?? 'FALSE',
    color:          data.color ?? '#0288d1',
    team_id:        data.team_id ?? '',
    created_by:     createdBy,
    ref_id:         data.ref_id ?? '',
    created_at:     nowStr(),
    updated_at:     nowStr(),
  };
  return repo.insert(event);
}

export async function updateEvent(eventId: string, data: Partial<CalendarEvent>, requester: JwtPayload): Promise<CalendarEvent> {
  const found = await repo.findOrThrow(eventId);
  if (requester.role === 'Coach' && found.data.created_by !== requester.user_id) {
    throw Object.assign(new Error('แก้ไขได้เฉพาะกิจกรรมที่ตัวเองสร้าง'), { code: 'RBAC_FORBIDDEN' });
  }
  return repo.update(eventId, data);
}

export async function deleteEvent(eventId: string, requester: JwtPayload): Promise<void> {
  const found = await repo.findOrThrow(eventId);
  if (requester.role === 'Coach' && found.data.created_by !== requester.user_id) {
    throw Object.assign(new Error('ลบได้เฉพาะกิจกรรมที่ตัวเองสร้าง'), { code: 'RBAC_FORBIDDEN' });
  }
  await repo.softDelete(eventId, TombstoneTitle<CalendarEvent>());
}

/**
 * Update all calendar events linked to a given ref_id.
 * Used when an activity or practice link's date/title changes.
 * Single read + a single batched write.
 */
export async function updateEventsByRefId(refId: string, patch: Partial<CalendarEvent>): Promise<void> {
  const all = await findAll<CalendarEvent>(SHEETS.EVENTS);
  const headers = await getHeaders(SHEETS.EVENTS);
  const updates: { rowIndex: number; row: string[] }[] = [];

  all.forEach((ev, i) => {
    if (ev.ref_id === refId && ev.title !== '[DELETED]') {
      const updated = { ...ev, ...patch, updated_at: nowStr() };
      updates.push({ rowIndex: i + 2, row: headers.map(h => String((updated as any)[h] ?? '')) });
    }
  });

  await batchUpdateRows(SHEETS.EVENTS, updates);
}

/**
 * Soft-delete all calendar events linked to a given ref_id (activity or
 * practice link). Single read + a single batched write for all matches.
 */
export async function deleteEventsByRefId(refId: string): Promise<void> {
  const all = await findAll<CalendarEvent>(SHEETS.EVENTS);
  const headers = await getHeaders(SHEETS.EVENTS);
  const updates: { rowIndex: number; row: string[] }[] = [];

  all.forEach((ev, i) => {
    if (ev.ref_id === refId && ev.title !== '[DELETED]') {
      const updated = { ...ev, title: '[DELETED]', updated_at: nowStr() };
      // Sheet row = array index + 2 (1-based + header row).
      updates.push({ rowIndex: i + 2, row: headers.map(h => String((updated as any)[h] ?? '')) });
    }
  });

  await batchUpdateRows(SHEETS.EVENTS, updates);
}
