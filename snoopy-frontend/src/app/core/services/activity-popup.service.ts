import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ActivityPopupService {
  /** Emit to force-open the popup (bypasses localStorage dedup) */
  readonly triggerOpen$ = new Subject<void>();

  /** How many upcoming activities exist (set by popup on load) */
  readonly activityCount$ = new BehaviorSubject<number>(0);

  open(): void {
    this.triggerOpen$.next();
  }
}
