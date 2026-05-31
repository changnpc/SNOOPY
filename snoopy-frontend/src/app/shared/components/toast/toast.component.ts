import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container">
      <div *ngFor="let t of toasts; trackBy: trackById"
           class="toast toast-{{t.type}}"
           [class.removing]="t['removing']">
        <span class="toast-icon">
          <svg *ngIf="t.type==='success'" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
          <svg *ngIf="t.type==='error'"   width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <svg *ngIf="t.type==='warning'" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
          <svg *ngIf="t.type==='info'"    width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
        </span>
        <span class="toast-msg">{{ t.message | t }}</span>
        <button class="toast-close" (click)="remove(t.id)"><span class="mi mi-sm">close</span></button>
      </div>
    </div>
  `,
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: (Toast & { removing?: boolean })[] = [];
  private sub!: Subscription;

  constructor(private toastSvc: ToastService) {}

  ngOnInit() {
    this.sub = this.toastSvc.toast$.subscribe(toast => {
      this.toasts.push(toast);
      setTimeout(() => this.remove(toast.id), toast.duration);
    });
  }

  remove(id: string) {
    const t = this.toasts.find(x => x.id === id);
    if (!t) return;
    t.removing = true;
    setTimeout(() => { this.toasts = this.toasts.filter(x => x.id !== id); }, 300);
  }

  trackById(_: number, t: Toast) { return t.id; }
  ngOnDestroy() { this.sub?.unsubscribe(); }
}
