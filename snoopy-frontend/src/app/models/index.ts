// ─── Team ───────────────────────────────────────────────────
export interface Team {
  team_id: string;
  team_name: string;
  description?: string;
  parent_team_id?: string;   // empty/null = big team; set = sub-team
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── User ───────────────────────────────────────────────────
export type UserRole = 'Super Admin' | 'Coach' | 'Player';

export interface User {
  user_id: string;
  google_sub?: string;
  email: string;
  role: UserRole;
  team_id?: string;           // big team (U16 / U21 / U26)
  sub_team_id?: string;       // sub-team within the big team; undefined = no sub-team
  team_name?: string;         // joined from Teams
  img_avatar_url?: string;
  th_prefix?: string;
  en_prefix?: string;
  th_first_name: string;
  en_first_name: string;
  th_last_name: string;
  en_last_name: string;
  phone?: string;             // restricted field
  birth_date?: string;        // restricted field
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AuthUser extends User {
  token: string;
}

// ─── Attendance ─────────────────────────────────────────────
export type AttendanceStatus = 'Present' | 'Absent' | 'Leave';

export interface AttendanceRecord {
  attendance_id: string;
  date: string;
  player_id: string;
  player?: User;              // joined
  team_id: string;
  status: AttendanceStatus;
  note?: string;
  checked_by: string;
  checked_at: string;
  updated_at: string;
}

// ─── Leave Request ──────────────────────────────────────────
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveRequest {
  leave_id: string;
  player_id: string;
  player?: User;              // joined
  team_id: string;
  team_name?: string;
  start_date: string;
  end_date: string;
  reason: string;
  evidence_url?: string;
  status: LeaveStatus;
  reject_reason?: string;
  action_by?: string;
  action_by_name?: string;
  action_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Calendar Event ─────────────────────────────────────────
export interface CalendarEvent {
  event_id: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  is_all_day: boolean;
  color: string;
  team_id?: string;
  team_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Activity ───────────────────────────────────────────────
export interface Activity {
  activity_id: string;
  title: string;
  date_from: string;
  date_to: string;
  location?: string;
  details: string;
  img_url?: string;
  url?: string;
  attachment_url?: string;
  attachment_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Practice Link ──────────────────────────────────────────
export interface PracticeLink {
  link_id: string;
  practice_date: string;
  team_id?: string;           // undefined/null = All Teams joint session
  team_name?: string;         // joined — 'ทุกทีม' when team_id is null
  section: string;            // e.g. "A", "B", "Session A" — unique per (date + team + section)
  player_link: string;
  coach_link?: string;
  note?: string;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Notification ───────────────────────────────────────────
export type NotificationType =
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_new'
  | 'feed_new'
  | 'practice_new';

export interface Notification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  ref_id?: string;
  is_read: boolean;
  created_at: string;
}

// ─── API Response Wrappers ──────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
