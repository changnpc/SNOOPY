import { Component, OnInit, Output, Input, EventEmitter } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface NavItem { path: string; label: string; icon: string; roles?: string[]; }

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit {
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Input() collapsed = false;
  @Input() mobileOpen = false;
  currentPath = '';
  unreadCount = 0;
  pendingLeaveCount = 0;

  // icon = Material Symbols name
  navItems: NavItem[] = [
    { path: '/dashboard',  label: 'แดชบอร์ด',      icon: 'space_dashboard' },
    { path: '/calendar',   label: 'ปฏิทิน',          icon: 'calendar_month' },
    { path: '/activity',   label: 'กิจกรรม',         icon: 'campaign' },
    { path: '/practice',   label: 'ลิงก์ซ้อม',       icon: 'link' },
    { path: '/athletes',   label: 'โปรไฟล์นักกีฬา', icon: 'groups' },
    { path: '/leave',      label: 'การลา',           icon: 'event_busy' },
    { path: '/attendance', label: 'เช็กชื่อ',        icon: 'how_to_reg', roles: ['Super Admin','Coach'] },
  ];

  adminItems: NavItem[] = [
    { path: '/teams',           label: 'จัดการทีม',    icon: 'shield_person' },
    { path: '/user-management', label: 'จัดการผู้ใช้', icon: 'manage_accounts', roles: ['Super Admin'] },
  ];

  constructor(
    public auth: AuthService,
    private router: Router,
    private notifSvc: NotificationService
  ) {}

  ngOnInit() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.currentPath = e.urlAfterRedirects;
    });
    this.currentPath = this.router.url;
    this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);
  }

  isActive(path: string): boolean { return this.currentPath.startsWith(path); }

  canSee(item: NavItem): boolean {
    if (!item.roles) return true;
    return item.roles.includes(this.auth.role);
  }

  navigate(path: string) { this.router.navigate([path]); }

  toggleCollapse() { this.collapsed = !this.collapsed; this.collapsedChange.emit(this.collapsed); }

  logout() { this.auth.logout(); }

  trackByPath(_: number, item: NavItem): string { return item.path; }
}
