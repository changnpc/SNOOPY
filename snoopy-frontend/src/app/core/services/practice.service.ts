import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { PracticeLink, ApiResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class PracticeService {
  constructor(private api: ApiService) {}

  getCurrent() {
    return this.api.get<ApiResponse<PracticeLink[]>>('/practice-links');
  }

  getHistory() {
    return this.api.get<ApiResponse<PracticeLink[]>>('/practice-links/history');
  }

  /** Practice sessions for a specific date + team (incl. archived). */
  getSessionsByDate(date: string, teamId: string) {
    return this.api.get<ApiResponse<PracticeLink[]>>('/practice-links/by-date', { date, team_id: teamId });
  }

  create(data: Partial<PracticeLink>) {
    return this.api.post<ApiResponse<PracticeLink>>('/practice-links', data);
  }

  update(id: string, data: Partial<PracticeLink>) {
    return this.api.put<ApiResponse<PracticeLink>>(`/practice-links/${id}`, data);
  }

  delete(id: string) {
    return this.api.delete<ApiResponse<null>>(`/practice-links/${id}`);
  }
}
