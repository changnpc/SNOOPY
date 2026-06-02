import { Component, OnInit } from '@angular/core';
import { ActivitiesService } from '../../../core/services/activities.service';
import { Activity } from '../../../models';

const STORAGE_KEY = 'snoopy_activity_popup_date';

@Component({
  selector: 'app-activity-popup',
  templateUrl: './activity-popup.component.html',
})
export class ActivityPopupComponent implements OnInit {
  show = false;
  activities: Activity[] = [];

  constructor(private svc: ActivitiesService) {}

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    const last  = localStorage.getItem(STORAGE_KEY);
    if (last === today) return; // already shown today

    this.svc.getAll().subscribe({
      next: (res: any) => {
        if (!res.success) return;
        const upcoming: Activity[] = (res.data as Activity[])
          .filter(a => a.title !== '[DELETED]' && a.date_to >= today)
          .sort((a, b) => a.date_from.localeCompare(b.date_from));
        if (upcoming.length === 0) return;
        this.activities = upcoming;
        this.show = true;
        localStorage.setItem(STORAGE_KEY, today);
      },
    });
  }

  close(): void { this.show = false; }
}
