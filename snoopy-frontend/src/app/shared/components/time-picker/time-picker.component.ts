import { Component, forwardRef, HostListener, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-time-picker',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TimePickerComponent), multi: true }],
  template: `
<div class="tp-wrap" (click)="$event.stopPropagation()">
  <button type="button" class="dp-trigger" [class.dp-open]="open" [disabled]="disabled" (click)="toggle()">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" class="dp-icon">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm.01 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
    </svg>
    <span>{{ value || 'เลือกเวลา' }}</span>
  </button>

  <div class="tp-dropdown" *ngIf="open">
    <div class="tp-list" #listEl>
      <button type="button" *ngFor="let t of slots"
              class="tp-item"
              [class.tp-selected]="t === value"
              (click)="select(t)">
        {{ t }}
      </button>
    </div>
  </div>
</div>
  `,
})
export class TimePickerComponent implements ControlValueAccessor, OnInit {
  open = false;
  value = '';
  disabled = false;
  slots: string[] = [];

  private onChange = (_: string) => {};
  private onTouched = () => {};

  ngOnInit() {
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 45]) {
        this.slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      }
    }
  }

  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) setTimeout(() => this.scrollToSelected(), 50);
  }

  scrollToSelected() {
    const el = document.querySelector('.tp-selected') as HTMLElement;
    el?.scrollIntoView({ block: 'center' });
  }

  select(t: string) { this.value = t; this.onChange(t); this.onTouched(); this.open = false; }

  @HostListener('document:click')
  onDocumentClick() { this.open = false; }

  writeValue(v: string) { this.value = v ?? ''; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
}
