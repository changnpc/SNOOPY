import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';
import { Notification, ApiResponse } from '../../../models';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
})
export class TopbarComponent implements OnInit {
  @Input() pageTitle = '';
  @Output() toggleSidebar = new EventEmitter<void>();

  showNotifPanel = false;
  notifications: Notification[] = [];
  unreadCount = 0;

  constructor(
    public auth: AuthService,
    private notifSvc: NotificationService,
    public theme: ThemeService,
    public langSvc: LanguageService,
    private router: Router
  ) {}

  toggleTheme() { this.theme.toggle(); }
  toggleLang() { this.langSvc.toggle(); }

  ngOnInit() {
    this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);
    this.loadNotifications();
  }

  loadNotifications() {
    this.notifSvc.getMyNotifications().subscribe((res: ApiResponse<Notification[]>) => {
      if (res.success) {
        this.notifications = res.data;
        const unread = res.data.filter((n: Notification) => !n.is_read).length;
        this.notifSvc.updateUnreadCount(unread);
      }
    });
  }

  togglePanel() {
    this.showNotifPanel = !this.showNotifPanel;
    if (this.showNotifPanel) this.loadNotifications();
  }

  markRead(id: string) {
    this.notifSvc.markAsRead(id).subscribe(() => this.loadNotifications());
  }

  markAllRead() {
    this.notifSvc.markAllRead().subscribe(() => this.loadNotifications());
  }

  deleteOne(id: string) {
    this.notifSvc.deleteOne(id).subscribe(() => this.loadNotifications());
  }

  clearAll() {
    this.notifSvc.clearAll().subscribe(() => {
      this.notifications = [];
      this.notifSvc.updateUnreadCount(0);
    });
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      leave_new: 'event_busy', leave_approved: 'task_alt', leave_rejected: 'cancel',
      feed_new: 'campaign', practice_new: 'link',
    };
    return map[type] ?? 'notifications';
  }

  timeAgo(dt: string): string {
    const en = this.langSvc.lang === 'en';
    const diff = (Date.now() - new Date(dt).getTime()) / 1000;
    if (diff < 60) return en ? 'just now' : 'เมื่อกี้';
    if (diff < 3600) return en ? `${Math.floor(diff/60)} min ago` : `${Math.floor(diff/60)} นาทีที่แล้ว`;
    if (diff < 86400) return en ? `${Math.floor(diff/3600)} hr ago` : `${Math.floor(diff/3600)} ชั่วโมงที่แล้ว`;
    return en ? `${Math.floor(diff/86400)} d ago` : `${Math.floor(diff/86400)} วันที่แล้ว`;
  }
}
