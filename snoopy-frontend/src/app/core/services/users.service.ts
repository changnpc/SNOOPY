import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { User, ApiResponse, PaginatedResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private api: ApiService) {}

  getAll(params?: { team_id?: string; role?: string; is_active?: boolean }) {
    return this.api.get<ApiResponse<User[]>>('/users', params as any);
  }

  getById(id: string) {
    return this.api.get<ApiResponse<User>>(`/users/${id}`);
  }

  create(formData: FormData) {
    return this.api.postForm<ApiResponse<User>>('/users', formData);
  }

  update(id: string, formData: FormData) {
    return this.api.putForm<ApiResponse<User>>(`/users/${id}`, formData);
  }

  deactivate(id: string) {
    return this.api.patch<ApiResponse<null>>(`/users/${id}/deactivate`);
  }

  reactivate(id: string) {
    return this.api.patch<ApiResponse<null>>(`/users/${id}/reactivate`);
  }
}
