import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'แดชบอร์ด',
  '/athletes':   'โปรไฟล์นักกีฬา',
  '/attendance': 'เช็กชื่อ',
  '/leave':      'การลา',
  '/calendar':   'ปฏิทิน',
  '/activity':   'กิจกรรม',
  '/practice':   'ลิงก์ซ้อม',
  '/teams':      'จัดการทีม',
  '/notifications':   'การแจ้งเตือน',
  '/user-management': 'จัดการผู้ใช้',
};

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  sidebarCollapsed = false;   // desktop rail collapse
  mobileOpen = false;         // mobile drawer
  pageTitle = 'แดชบอร์ด';

  // Branding (shown in footer)
  readonly appName     = environment.appName;
  readonly appVersion  = environment.version;
  readonly author      = environment.author;
  readonly authorEmail = environment.authorEmail;
  readonly copyrightYear = environment.copyrightYear;

  constructor(private router: Router) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url = e.urlAfterRedirects.split('?')[0];
      const key = Object.keys(PAGE_TITLES).find(k => url.startsWith(k)) ?? '';
      this.pageTitle = PAGE_TITLES[key] ?? '';
      this.mobileOpen = false; // close drawer on navigation
    });
  }

  // On mobile (<=900px) the button opens the drawer; on desktop it collapses the rail.
  toggleSidebar() {
    if (window.innerWidth <= 900) this.mobileOpen = !this.mobileOpen;
    else this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
