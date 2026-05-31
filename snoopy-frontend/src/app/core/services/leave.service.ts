import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LeaveRequest, ApiResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  constructor(private api: ApiService) {}

  getAll(params?: { status?: string; team_id?: string }) {
    return this.api.get<ApiResponse<LeaveRequest[]>>('/leave-requests', params as any);
  }

  getMy() {
    return this.api.get<ApiResponse<LeaveRequest[]>>('/leave-requests/my');
  }

  submit(formData: FormData) {
    return this.api.postForm<ApiResponse<LeaveRequest>>('/leave-requests', formData);
  }

  cancel(id: string) {
    return this.api.patch<ApiResponse<null>>(`/leave-requests/${id}/cancel`);
  }

  approve(id: string) {
    return this.api.patch<ApiResponse<null>>(`/leave-requests/${id}/approve`);
  }

  reject(id: string, reason: string) {
    return this.api.patch<ApiResponse<null>>(`/leave-requests/${id}/reject`, { reject_reason: reason });
  }
}
