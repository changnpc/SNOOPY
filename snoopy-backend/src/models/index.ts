// Shared TypeScript interfaces (mirrors frontend models)
export type UserRole = 'Super Admin' | 'Coach' | 'Player';
export type AttendanceStatus = 'Present' | 'Absent' | 'Leave';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type NotificationType = 'leave_approved' | 'leave_rejected' | 'leave_new' | 'feed_new' | 'practice_new';

export interface Team {
  team_id: string; team_name: string; description?: string;
  parent_team_id?: string;   // null/empty = big team; non-null = sub-team
  is_active: boolean; created_at: string; updated_at: string;
}
export interface User {
  user_id: string; google_sub?: string; email: string; role: UserRole;
  team_id?: string;          // big team (U16 / U21 / U26)
  sub_team_id?: string;      // sub-team within the big team; null = no sub-team
  img_avatar_url?: string; th_prefix?: string; en_prefix?: string;
  th_first_name: string; en_first_name: string; th_last_name: string; en_last_name: string;
  phone?: string; birth_date?: string; is_active: boolean;
  last_login?: string;
  created_at: string; updated_at: string; created_by?: string;
}
export interface JwtPayload {
  user_id: string; email: string; role: UserRole; team_id?: string;
}

export interface PracticeLink {
  link_id: string;
  practice_date: string;
  team_id?: string;           // NULL = All Teams joint session
  team_name?: string;         // joined
  section: string;            // e.g. "A", "B", "Session A" (unique per date+team+section)
  player_link: string;
  coach_link?: string;
  note?: string;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiSuccess<T> { success: true; data: T; message?: string; }
export interface ApiError { success: false; error: { code: string; message: string; details?: unknown }; }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type CompetitionLevel = 'regional' | 'national' | 'international';
export type AwardType = string; // 'Gold' | 'Silver' | 'Bronze' | 'Special' | 'เข้าร่วม' | ''

export interface Competition {
  competition_id: string;
  name: string;
  level: CompetitionLevel;
  location: string;
  date_from: string;
  date_to: string;
  organizer: string;
  note?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CompetitionResultStatus = 'Pending' | 'Approved' | 'Rejected';

export interface CompetitionResult {
  result_id: string;
  competition_id: string;   // optional FK; free-text name stored here when no linked competition
  competition_name: string; // free-text display name (required)
  user_id: string;
  date_from?: string;       // competition start date (YYYY-MM-DD)
  date_to?: string;         // competition end date (YYYY-MM-DD)
  category: string;
  rank: number | string;
  award: AwardType;
  score: string;
  status: CompetitionResultStatus;
  note?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function ok<T>(data: T, message?: string): ApiSuccess<T> {
  return { success: true, data, message };
}
export function fail(code: string, message: string, details?: unknown): ApiError {
  return { success: false, error: { code, message, details } };
}
