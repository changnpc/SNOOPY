import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { ApiService } from './api.service';
import { Notification, ApiResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _unreadCount = new BehaviorSubject<number>(0);
  unreadCount$ = this._unreadCount.asObservable();

  constructor(private api: ApiService) {}

  getMyNotifications() {
    // Google Sheets returns is_read as the string 'TRUE'/'FALSE'.
    // Normalize to a real boolean so all consumers (topbar + page) work correctly.
    return this.api.get<ApiResponse<Notification[]>>('/notifications/my').pipe(
      map(res => {
        if (res.success && Array.isArray(res.data)) {
          res.data = res.data.map(n => ({
            ...n,
            is_read: String((n as any).is_read).toUpperCase() === 'TRUE',
          }));
        }
        return res;
      })
    );
  }

  markAsRead(id: string) {
    return this.api.patch<ApiResponse<null>>(`/notifications/${id}/read`);
  }

  markAllRead() {
    return this.api.patch<ApiResponse<null>>('/notifications/read-all');
  }

  deleteOne(id: string) {
    return this.api.delete<ApiResponse<null>>(`/notifications/${id}`);
  }

  clearAll() {
    return this.api.delete<ApiResponse<null>>('/notifications');
  }

  updateUnreadCount(count: number) {
    this._unreadCount.next(count);
  }
}
