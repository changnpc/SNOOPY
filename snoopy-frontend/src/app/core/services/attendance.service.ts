import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AttendanceRecord, ApiResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  constructor(private api: ApiService) {}

  getSheet(date: string, teamId: string) {
    return this.api.get<ApiResponse<AttendanceRecord[]>>('/attendance', { date, team_id: teamId });
  }

  getMy() {
    return this.api.get<ApiResponse<AttendanceRecord[]>>('/attendance/my');
  }

  getHistory(params?: { team_id?: string; date_from?: string; date_to?: string }) {
    return this.api.get<ApiResponse<AttendanceRecord[]>>('/attendance/history', params as any);
  }

  upsert(data: { date: string; player_id: string; team_id: string; status: string; note?: string }) {
    return this.api.post<ApiResponse<AttendanceRecord>>('/attendance', data);
  }

  /** Save a whole team in one request — server does 1 read + 2 writes. */
  batchUpsert(records: { date: string; player_id: string; team_id: string; status: string; note?: string }[]) {
    return this.api.post<ApiResponse<null>>('/attendance/batch', records);
  }
}
