import { Component, forwardRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-color-palette',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ColorPaletteComponent), multi: true }],
  template: `
<div class="cp-wrap" (click)="$event.stopPropagation()">
  <button type="button" class="cp-trigger" [class.dp-open]="open" (click)="open=!open">
    <span class="cp-swatch" [style.background]="value"></span>
    <span style="font-size:.85rem;color:var(--text-secondary)">{{ langSvc.lang === 'en' ? 'Select color' : 'เลือกสี' }}</span>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:var(--text-muted);margin-left:auto">
      <path d="M7 10l5 5 5-5z"/>
    </svg>
  </button>
  <div class="cp-dropdown" *ngIf="open">
    <div class="cp-grid">
      <button type="button" *ngFor="let c of colors" class="cp-dot"
              [style.background]="c" [title]="c" (click)="pick(c)">
        <svg *ngIf="c===value" width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </button>
    </div>
  </div>
</div>
  `,
})
export class ColorPaletteComponent implements ControlValueAccessor {
  open = false;
  value = '#0288d1';

  readonly colors = [
    '#d50000','#e67c73',
    '#f4511e','#f6bf26',
    '#33b679','#0b8043',
    '#039be5','#3f51b5',
    '#7986cb','#8e24aa',
    '#616161',
  ];

  private onChange = (_: string) => {};
  private onTouched = () => {};

  constructor(public langSvc: LanguageService) {}

  pick(c: string) { this.value = c; this.onChange(c); this.onTouched(); this.open = false; }

  @HostListener('document:click') onDocClick() { this.open = false; }

  writeValue(v: string) { this.value = v || '#0288d1'; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState() {}
}
