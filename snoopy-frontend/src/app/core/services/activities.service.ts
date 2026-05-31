import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Activity, ApiResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  constructor(private api: ApiService) {}

  getAll() {
    return this.api.get<ApiResponse<Activity[]>>('/activities');
  }

  create(formData: FormData) {
    return this.api.postForm<ApiResponse<Activity>>('/activities', formData);
  }

  update(id: string, formData: FormData) {
    return this.api.putForm<ApiResponse<Activity>>(`/activities/${id}`, formData);
  }

  delete(id: string) {
    return this.api.delete<ApiResponse<null>>(`/activities/${id}`);
  }
}
