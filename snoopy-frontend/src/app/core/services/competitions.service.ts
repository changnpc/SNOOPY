import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { ApiResponse, Competition, CompetitionResult, CoachPlayerStats, PlayerDashboardStats } from '../../models';

@Injectable({ providedIn: 'root' })
export class CompetitionsService {
  constructor(private api: ApiService) {}

  getAll()      { return this.api.get<ApiResponse<Competition[]>>('/competitions'); }
  getById(id: string) { return this.api.get<ApiResponse<Competition>>(`/competitions/${id}`); }
  getMyResults() { return this.api.get<ApiResponse<CompetitionResult[]>>('/competitions/my-results'); }
  getResultsByCompetition(id: string) { return this.api.get<ApiResponse<CompetitionResult[]>>(`/competitions/${id}/results`); }

  create(data: Partial<Competition>)            { return this.api.post<ApiResponse<Competition>>('/competitions', data); }
  update(id: string, data: Partial<Competition>) { return this.api.put<ApiResponse<Competition>>(`/competitions/${id}`, data); }
  delete(id: string)                             { return this.api.delete<ApiResponse<null>>(`/competitions/${id}`); }

  createResult(data: Partial<CompetitionResult>)             { return this.api.post<ApiResponse<CompetitionResult>>('/competitions/results', data); }
  updateResult(id: string, data: Partial<CompetitionResult>) { return this.api.put<ApiResponse<CompetitionResult>>(`/competitions/results/${id}`, data); }
  deleteResult(id: string)                                   { return this.api.delete<ApiResponse<null>>(`/competitions/results/${id}`); }
  getPendingResults()                                        { return this.api.get<ApiResponse<CompetitionResult[]>>('/competitions/results/pending'); }
  approveResult(id: string)                                  { return this.api.post<ApiResponse<CompetitionResult>>(`/competitions/results/${id}/approve`, {}); }
  rejectResult(id: string)                                   { return this.api.post<ApiResponse<CompetitionResult>>(`/competitions/results/${id}/reject`, {}); }

  getDashboardCoach()  { return this.api.get<ApiResponse<CoachPlayerStats[]>>('/dashboard/coach'); }
  getDashboardPlayer() { return this.api.get<ApiResponse<PlayerDashboardStats>>('/dashboard/player'); }
}
