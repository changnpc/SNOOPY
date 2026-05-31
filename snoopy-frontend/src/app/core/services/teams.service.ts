import { Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Team, ApiResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private _cache$: Observable<ApiResponse<Team[]>> | null = null;

  // id → name map for synchronous lookups (used by the teamName pipe).
  // Includes big teams AND sub-teams so any team_id resolves.
  private _nameMap = new Map<string, string>();
  private _namesLoaded = false;

  constructor(private api: ApiService) {}

  /** Populate the id→name map once (idempotent, cached). */
  ensureNames(): void {
    if (this._namesLoaded) return;
    this._namesLoaded = true;
    this.getAllIncludingSub().subscribe(res => {
      if (res.success) {
        this._nameMap.clear();
        res.data.forEach(t => this._nameMap.set(t.team_id, t.team_name));
      } else {
        this._namesLoaded = false; // allow retry on next call
      }
    });
  }

  /** Synchronous team name resolver. Returns id as fallback, '' if empty. */
  nameOf(id: string | null | undefined): string {
    if (!id) return '';
    return this._nameMap.get(id) ?? id;
  }

  private invalidateNames(): void { this._namesLoaded = false; }

  // Returns only big teams (parent_team_id = null)
  getAll(forceRefresh = false): Observable<ApiResponse<Team[]>> {
    if (!this._cache$ || forceRefresh) {
      this._cache$ = this.api.get<ApiResponse<Team[]>>('/teams').pipe(
        shareReplay(1)
      );
    }
    return this._cache$;
  }

  // Returns big teams AND sub-teams
  getAllIncludingSub(): Observable<ApiResponse<Team[]>> {
    return this.api.get<ApiResponse<Team[]>>('/teams', { include_sub: 'true' });
  }

  // Returns sub-teams of a specific big team
  getSubTeams(parentId: string): Observable<ApiResponse<Team[]>> {
    return this.api.get<ApiResponse<Team[]>>(`/teams/${parentId}/sub-teams`);
  }

  create(data: { team_name: string; description?: string; parent_team_id?: string }) {
    this._cache$ = null;
    this.invalidateNames();
    return this.api.post<ApiResponse<Team>>('/teams', data);
  }

  update(id: string, data: Partial<Team>) {
    this._cache$ = null;
    this.invalidateNames();
    return this.api.put<ApiResponse<Team>>(`/teams/${id}`, data);
  }

  delete(id: string) {
    this._cache$ = null;
    this.invalidateNames();
    return this.api.delete<ApiResponse<null>>(`/teams/${id}`);
  }
}
