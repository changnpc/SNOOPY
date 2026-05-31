import { SHEETS } from '../config/sheets.config';
import { nowStr } from '../utils/date';
import { createNotification } from './notifications.service';
import { deleteEventsByRefId, updateEventsByRefId } from './events.service';
import { SheetRepository, TombstoneTitle } from './base/sheet-repository';

export interface Activity {
  activity_id: string; title: string; date_from: string; date_to: string;
  location: string; details: string; img_url: string;
  url: string;
  attachment_url: string; attachment_name: string;
  created_by: string; created_at: string; updated_at: string;
}

const repo = new SheetRepository<Activity>(SHEETS.ACTIVITIES, 'activity_id', 'ACT', 'ACTIVITY_NOT_FOUND', 'ไม่พบกิจกรรม');

export async function getActivities(): Promise<Activity[]> {
  const all = await repo.findAll();
  // Ascending by date_from: nearest upcoming activity first.
  return all.sort((a, b) => a.date_from.localeCompare(b.date_from));
}

export async function createActivity(data: Partial<Activity>, createdBy: string): Promise<Activity> {
  const activity: Activity = {
    activity_id: repo.newId(),
    title:       data.title!,
    date_from:   data.date_from!,
    date_to:     data.date_to!,
    location:    data.location ?? '',
    details:     data.details!,
    img_url:         data.img_url ?? '',
    url:             data.url ?? '',
    attachment_url:  data.attachment_url ?? '',
    attachment_name: data.attachment_name ?? '',
    created_by:      createdBy,
    created_at:  nowStr(),
    updated_at:  nowStr(),
  };
  await repo.insert(activity);
  // Notify all users
  await createNotification({
    type: 'feed_new',
    title: 'กิจกรรมใหม่',
    message: activity.title,
    ref_id: activity.activity_id,
    target_role: 'Player',
  });
  return activity;
}

export async function updateActivity(activityId: string, data: Partial<Activity>): Promise<Activity> {
  // Get the current record before overwriting so we can detect changes.
  const before = await repo.findOrThrow(activityId);
  const updated = await repo.update(activityId, data);

  // Sync any linked calendar events when date or title changed.
  const titleChanged     = data.title     && data.title     !== before.data.title;
  const dateFromChanged  = data.date_from && data.date_from !== before.data.date_from;
  const dateToChanged    = data.date_to   && data.date_to   !== before.data.date_to;

  if (titleChanged || dateFromChanged || dateToChanged) {
    const calPatch: Record<string, string> = {};
    if (titleChanged)    calPatch['title']          = updated.title;
    if (dateFromChanged) calPatch['start_datetime']  = `${updated.date_from}T00:00:00`;
    if (dateToChanged)   calPatch['end_datetime']    = `${updated.date_to}T00:00:00`;
    await updateEventsByRefId(activityId, calPatch as any);
  }

  return updated;
}

export async function deleteActivity(activityId: string): Promise<void> {
  // Soft-delete (tombstone) + cascade to linked calendar events.
  await repo.softDelete(activityId, TombstoneTitle<Activity>(deleteEventsByRefId));
}
