import { findAll, findOne, appendRow, updateRow, getHeaders } from './google-sheets.service';
import { SHEETS } from '../config/sheets.config';
import { LeaveStatus, JwtPayload } from '../models';
import { generateId } from '../utils/id-generator';
import { nowStr, todayStr } from '../utils/date';
import { createNotification } from './notifications.service';
import { upsertAttendance } from './attendance.service';

// Enumerate all YYYY-MM-DD dates from start to end (inclusive)
function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const d = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (d <= last) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export interface LeaveRequest {
  leave_id: string; player_id: string; team_id: string;
  start_date: string; end_date: string; reason: string;
  evidence_url: string; status: LeaveStatus; reject_reason: string;
  action_by: string; action_at: string; created_at: string; updated_at: string;
}

// ─── Get leave requests (with filters) ───────────────────────
export async function getLeaveRequests(
  requester: JwtPayload,
  filter?: { status?: LeaveStatus; team_id?: string }
): Promise<LeaveRequest[]> {
  let all = await findAll<LeaveRequest>(SHEETS.LEAVE_REQUESTS);

  if (requester.role === 'Coach') {
    all = all.filter(r => r.team_id === requester.team_id);
  } else if (requester.role === 'Player') {
    all = all.filter(r => r.player_id === requester.user_id);
  } else if (filter?.team_id) {
    all = all.filter(r => r.team_id === filter.team_id);
  }
  if (filter?.status) all = all.filter(r => r.status === filter.status);
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ─── Submit leave request (Player) ───────────────────────────
export async function submitLeaveRequest(
  data: { start_date: string; end_date: string; reason: string; evidence_url?: string },
  requester: JwtPayload
): Promise<LeaveRequest> {
  // Validation
  if (data.start_date < todayStr()) {
    throw Object.assign(new Error('วันเริ่มลาต้องไม่ก่อนวันปัจจุบัน'), { code: 'LEAVE_DATE_IN_PAST' });
  }
  if (data.end_date < data.start_date) {
    throw Object.assign(new Error('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม'), { code: 'VALIDATION_ERROR' });
  }

  // Conflict check
  const existing = await findAll<LeaveRequest>(SHEETS.LEAVE_REQUESTS);
  const conflict = existing.find(r =>
    r.player_id === requester.user_id &&
    ['Pending', 'Approved'].includes(r.status) &&
    !(r.end_date < data.start_date || r.start_date > data.end_date)
  );
  if (conflict) {
    throw Object.assign(new Error('มีคำขอลาซ้อนกับช่วงวันที่ระบุอยู่แล้ว'), { code: 'LEAVE_CONFLICT' });
  }

  const headers = await getHeaders(SHEETS.LEAVE_REQUESTS);
  const leave: LeaveRequest = {
    leave_id:     generateId('LV'),
    player_id:    requester.user_id,
    team_id:      requester.team_id ?? '',
    start_date:   data.start_date,
    end_date:     data.end_date,
    reason:       data.reason,
    evidence_url: data.evidence_url ?? '',
    status:       'Pending',
    reject_reason: '',
    action_by:    '',
    action_at:    '',
    created_at:   nowStr(),
    updated_at:   nowStr(),
  };
  const row = headers.map(h => String((leave as any)[h] ?? ''));
  await appendRow(SHEETS.LEAVE_REQUESTS, row);

  // Notify Coach + Super Admin
  await createNotification({
    type: 'leave_new',
    title: 'คำขอลาใหม่',
    message: `มีคำขอลาใหม่ วันที่ ${data.start_date}${data.start_date !== data.end_date ? ' – ' + data.end_date : ''}`,
    ref_id: leave.leave_id,
    target_role: 'Coach',
    target_team_id: requester.team_id,
  });

  return leave;
}

// ─── Cancel leave (Player, Pending only) ────────────────────
export async function cancelLeave(leaveId: string, requester: JwtPayload): Promise<void> {
  const found = await findOne<LeaveRequest>(SHEETS.LEAVE_REQUESTS, 'leave_id', leaveId);
  if (!found) throw Object.assign(new Error('ไม่พบคำขอลา'), { code: 'LEAVE_NOT_FOUND' });
  if (found.data.player_id !== requester.user_id) {
    throw Object.assign(new Error('ไม่มีสิทธิ์ยกเลิกคำขอนี้'), { code: 'RBAC_FORBIDDEN' });
  }
  if (found.data.status !== 'Pending') {
    throw Object.assign(new Error('สามารถยกเลิกได้เฉพาะคำขอที่มีสถานะ Pending'), { code: 'LEAVE_NOT_PENDING' });
  }
  await _updateLeaveStatus(found, 'Cancelled', requester.user_id);
}

// ─── Approve leave (Coach/Admin) ─────────────────────────────
export async function approveLeave(leaveId: string, requester: JwtPayload): Promise<void> {
  const found = await findOne<LeaveRequest>(SHEETS.LEAVE_REQUESTS, 'leave_id', leaveId);
  if (!found) throw Object.assign(new Error('ไม่พบคำขอลา'), { code: 'LEAVE_NOT_FOUND' });
  if (requester.role === 'Coach' && found.data.team_id !== requester.team_id) {
    throw Object.assign(new Error('ไม่มีสิทธิ์อนุมัติคำขอของทีมอื่น'), { code: 'RBAC_WRONG_TEAM' });
  }
  if (found.data.status !== 'Pending') {
    throw Object.assign(new Error('คำขอนี้ไม่อยู่ในสถานะ Pending'), { code: 'LEAVE_NOT_PENDING' });
  }
  await _updateLeaveStatus(found, 'Approved', requester.user_id);

  // Auto-mark attendance as "Leave" for every day in the approved range
  const { player_id, team_id, start_date, end_date } = found.data;
  for (const date of dateRange(start_date, end_date)) {
    try {
      await upsertAttendance(
        { date, player_id, team_id, status: 'Leave', note: 'ลาที่ได้รับอนุมัติ' },
        requester.user_id,
        requester
      );
    } catch (e) {
      console.warn(`[Leave] Could not auto-mark attendance for ${player_id} on ${date}:`, e);
    }
  }

  await createNotification({
    type: 'leave_approved',
    title: 'คำขอลาได้รับอนุมัติ',
    message: `คำขอลาของคุณวันที่ ${found.data.start_date} ได้รับการอนุมัติแล้ว`,
    ref_id: leaveId,
    target_user_id: found.data.player_id,
  });
}

// ─── Reject leave (Coach/Admin) ──────────────────────────────
export async function rejectLeave(leaveId: string, rejectReason: string, requester: JwtPayload): Promise<void> {
  if (!rejectReason || rejectReason.trim().length < 5) {
    throw Object.assign(new Error('กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร'), { code: 'REJECT_REASON_REQUIRED' });
  }
  const found = await findOne<LeaveRequest>(SHEETS.LEAVE_REQUESTS, 'leave_id', leaveId);
  if (!found) throw Object.assign(new Error('ไม่พบคำขอลา'), { code: 'LEAVE_NOT_FOUND' });
  if (requester.role === 'Coach' && found.data.team_id !== requester.team_id) {
    throw Object.assign(new Error('ไม่มีสิทธิ์ปฏิเสธคำขอของทีมอื่น'), { code: 'RBAC_WRONG_TEAM' });
  }
  if (found.data.status !== 'Pending') {
    throw Object.assign(new Error('คำขอนี้ไม่อยู่ในสถานะ Pending'), { code: 'LEAVE_NOT_PENDING' });
  }
  await _updateLeaveStatus(found, 'Rejected', requester.user_id, rejectReason);
  await createNotification({
    type: 'leave_rejected',
    title: 'คำขอลาถูกปฏิเสธ',
    message: `คำขอลาของคุณวันที่ ${found.data.start_date} ถูกปฏิเสธ: ${rejectReason}`,
    ref_id: leaveId,
    target_user_id: found.data.player_id,
  });
}

async function _updateLeaveStatus(
  found: { data: LeaveRequest; rowIndex: number },
  status: LeaveStatus,
  actionBy: string,
  rejectReason?: string
): Promise<void> {
  const headers = await getHeaders(SHEETS.LEAVE_REQUESTS);
  const updated: LeaveRequest = {
    ...found.data,
    status,
    reject_reason: rejectReason ?? found.data.reject_reason,
    action_by:     status !== 'Cancelled' ? actionBy : '',
    action_at:     status !== 'Cancelled' ? nowStr() : '',
    updated_at:    nowStr(),
  };
  const row = headers.map(h => String((updated as any)[h] ?? ''));
  await updateRow(SHEETS.LEAVE_REQUESTS, found.rowIndex, row);
}
