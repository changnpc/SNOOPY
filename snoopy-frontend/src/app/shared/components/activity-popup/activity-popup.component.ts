import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivitiesService } from '../../../core/services/activities.service';
import { ActivityPopupService } from '../../../core/services/activity-popup.service';
import { Activity } from '../../../models';

const STORAGE_KEY = 'snoopy_activity_popup_date';

@Component({
  selector: 'app-activity-popup',
  templateUrl: './activity-popup.component.html',
})
export class ActivityPopupComponent implements OnInit, OnDestroy {
  show = false;
  activities: Activity[] = [];
  loading = false;

  private sub = new Subscription();

  constructor(
    private svc: ActivitiesService,
    private popupSvc: ActivityPopupService,
  ) {}

  ngOnInit(): void {
    // Auto show once per day
    const today = new Date().toISOString().slice(0, 10);
    const last = localStorage.getItem(STORAGE_KEY);
    if (last !== today) {
      this.fetchAndShow(today, true);
    } else {
      // Still load count for topbar badge even if we don't show popup
      this.fetchCount(today);
    }

    // Listen for manual trigger from topbar button
    this.sub.add(
      this.popupSvc.triggerOpen$.subscribe(() => {
        const t = new Date().toISOString().slice(0, 10);
        this.fetchAndShow(t, false);
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private fetchAndShow(today: string, setStorage: boolean): void {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res.success) return;
        const upcoming: Activity[] = (res.data as Activity[])
          .filter((a: Activity) => a.title !== '[DELETED]' && a.date_to >= today)
          .sort((a: Activity, b: Activity) => a.date_from.localeCompare(b.date_from));

        this.popupSvc.activityCount$.next(upcoming.length);

        if (upcoming.length === 0) return;
        this.activities = upcoming;
        this.show = true;
        if (setStorage) localStorage.setItem(STORAGE_KEY, today);
      },
      error: () => { this.loading = false; },
    });
  }

  private fetchCount(today: string): void {
    this.svc.getAll().subscribe({
      next: (res: any) => {
        if (!res.success) return;
        const count = (res.data as Activity[])
          .filter((a: Activity) => a.title !== '[DELETED]' && a.date_to >= today)
          .length;
        this.popupSvc.activityCount$.next(count);
      },
    });
  }

  close(): void { this.show = false; }

  isMapLink(url?: string): boolean {
    return !!url && /maps\.app\.goo\.gl|google\.[a-z.]+\/maps|goo\.gl\/maps/i.test(url);
  }
}
