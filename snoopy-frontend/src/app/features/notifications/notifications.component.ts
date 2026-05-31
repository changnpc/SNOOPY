import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { LanguageService } from '../../core/services/language.service';
import { Notification, NotificationType } from '../../models';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  loading = true;
  notifications: Notification[] = [];
  filter: 'all' | 'unread' = 'all';
  markingAll = false;

  constructor(private svc: NotificationService, private toast: ToastService, private langSvc: LanguageService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.getMyNotifications().subscribe({
      next: (r: any) => {
        this.notifications = r.success ? r.data : [];
        this.svc.updateUnreadCount(this.unreadCount);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  markRead(n: Notification) {
    if (n.is_read) return;
    this.svc.markAsRead(n.notification_id).subscribe(() => {
      n.is_read = true;
      this.svc.updateUnreadCount(this.unreadCount);
    });
  }

  markAll() {
    this.markingAll = true;
    this.svc.markAllRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.is_read = true);
        this.svc.updateUnreadCount(0);
        this.markingAll = false;
        this.toast.success('อ่านทั้งหมดแล้ว');
      },
      error: () => { this.markingAll = false; }
    });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.is_read).length;
  }

  get displayed(): Notification[] {
    return this.filter === 'unread'
      ? this.notifications.filter(n => !n.is_read)
      : this.notifications;
  }

  icon(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      leave_approved: 'task_alt',
      leave_rejected: 'cancel',
      leave_new:      'event_busy',
      feed_new:       'campaign',
      practice_new:   'link',
    };
    return map[type] ?? 'notifications';
  }

  iconColor(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      leave_approved: '#15803d',
      leave_rejected: '#c0292e',
      leave_new:      '#b45309',
      feed_new:       '#1b3a8f',
      practice_new:   '#2563eb',
    };
    return map[type] ?? '#475569';
  }

  iconBg(type: NotificationType): string {
    const map: Record<NotificationType, string> = {
      leave_approved: '#e7f6ec',
      leave_rejected: '#fdeaec',
      leave_new:      '#fdf2e3',
      feed_new:       '#eaf0fc',
      practice_new:   '#e8f1ff',
    };
    return map[type] ?? '#f1f5f9';
  }

  formatDate(d: string): string {
    const en = this.langSvc.lang === 'en';
    const dt = new Date(d);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - dt.getTime()) / 60000);
    if (diffMin < 1) return en ? 'just now' : 'เพิ่งเมื่อกี้';
    if (diffMin < 60) return en ? `${diffMin} min ago` : `${diffMin} นาทีที่แล้ว`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return en ? `${diffH} hr ago` : `${diffH} ชั่วโมงที่แล้ว`;
    return dt.toLocaleDateString(en ? 'en-GB' : 'th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
