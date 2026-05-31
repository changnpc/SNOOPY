import {
  Component, forwardRef, HostListener, OnInit, Input
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';

interface CalCell { day: number | null; date: string; isToday: boolean; isOtherMonth: boolean; }

@Component({
  selector: 'app-date-picker',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DatePickerComponent),
    multi: true,
  }],
  template: `
<div class="dp-wrap" (click)="$event.stopPropagation()">
  <!-- Trigger button -->
  <button type="button" class="dp-trigger" [class.dp-open]="open" (click)="toggle()">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="dp-icon">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
    </svg>
    <span>{{ displayValue }}</span>
  </button>

  <!-- Dropdown -->
  <div class="dp-dropdown" *ngIf="open">
    <!-- Month/Year nav -->
    <div class="dp-nav">
      <button type="button" class="dp-nav-btn" (click)="prevMonth()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
      <div class="dp-month-label">{{ months[viewMonth] }} {{ yearLabel }}</div>
      <button type="button" class="dp-nav-btn" (click)="nextMonth()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </button>
    </div>

    <!-- Day headers -->
    <div class="dp-grid">
      <div class="dp-day-hdr" *ngFor="let d of dayHeaders">{{ d }}</div>
      <!-- Cells -->
      <button type="button"
              *ngFor="let c of cells"
              class="dp-cell"
              [class.dp-other]="c.isOtherMonth"
              [class.dp-today]="c.isToday"
              [class.dp-selected]="c.date === value"
              [disabled]="c.isOtherMonth"
              (click)="select(c.date)">
        {{ c.day }}
      </button>
    </div>

    <!-- Footer -->
    <div class="dp-footer">
      <button type="button" class="dp-footer-btn" (click)="selectToday()">{{ todayLabel }}</button>
    </div>
  </div>
</div>
  `,
})
export class DatePickerComponent implements ControlValueAccessor, OnInit {
  @Input() placeholder = 'เลือกวันที่';
  @Input() min = '';

  open = false;
  value = '';
  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth();
  cells: CalCell[] = [];
  disabled = false;

  readonly thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                       'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  readonly enMonths = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
  readonly thDays = ['อา','จ','อ','พ','พฤ','ศ','ส'];
  readonly enDays = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  private onChange = (_: string) => {};
  private onTouched = () => {};

  constructor(private langSvc: LanguageService) {}

  ngOnInit() { this.buildCells(); }

  get isEn(): boolean { return this.langSvc.lang === 'en'; }
  get months(): string[] { return this.isEn ? this.enMonths : this.thMonths; }
  get dayHeaders(): string[] { return this.isEn ? this.enDays : this.thDays; }
  get yearLabel(): number { return this.isEn ? this.viewYear : this.viewYear + 543; }
  get todayLabel(): string { return this.isEn ? 'Today' : 'วันนี้'; }

  get displayValue(): string {
    if (!this.value) return this.isEn ? (this.placeholder === 'เลือกวันที่' ? 'Select date' : this.placeholder) : this.placeholder;
    const [y, m, d] = this.value.split('-').map(Number);
    return this.isEn ? `${d} ${this.enMonths[m-1]} ${y}` : `${d} ${this.thMonths[m-1]} ${y + 543}`;
  }

  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open && this.value) {
      const [y, m] = this.value.split('-').map(Number);
      this.viewYear = y; this.viewMonth = m - 1;
      this.buildCells();
    }
  }

  prevMonth() {
    if (--this.viewMonth < 0) { this.viewMonth = 11; this.viewYear--; }
    this.buildCells();
  }

  nextMonth() {
    if (++this.viewMonth > 11) { this.viewMonth = 0; this.viewYear++; }
    this.buildCells();
  }

  buildCells() {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = this.fmt(today.getFullYear(), today.getMonth()+1, today.getDate());
    const first = new Date(this.viewYear, this.viewMonth, 1);
    const last  = new Date(this.viewYear, this.viewMonth+1, 0);
    const cells: CalCell[] = [];

    for (let i = 0; i < first.getDay(); i++) {
      const d = new Date(this.viewYear, this.viewMonth, -first.getDay()+i+1);
      cells.push({ day: d.getDate(), date: this.fmt(d.getFullYear(), d.getMonth()+1, d.getDate()), isToday: false, isOtherMonth: true });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const dateStr = this.fmt(this.viewYear, this.viewMonth+1, d);
      cells.push({ day: d, date: dateStr, isToday: dateStr === todayStr, isOtherMonth: false });
    }
    const remain = (7 - cells.length % 7) % 7;
    for (let i = 1; i <= remain; i++) {
      const d = new Date(this.viewYear, this.viewMonth+1, i);
      cells.push({ day: d.getDate(), date: this.fmt(d.getFullYear(), d.getMonth()+1, d.getDate()), isToday: false, isOtherMonth: true });
    }
    this.cells = cells;
  }

  private fmt(y: number, m: number, d: number): string {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  select(date: string) {
    this.value = date;
    this.onChange(date);
    this.onTouched();
    this.open = false;
  }

  selectToday() {
    const t = new Date();
    this.select(this.fmt(t.getFullYear(), t.getMonth()+1, t.getDate()));
  }

  @HostListener('document:click')
  onDocumentClick() { this.open = false; }

  writeValue(v: string) {
    this.value = v ?? '';
    if (v) {
      const [y, m] = v.split('-').map(Number);
      this.viewYear = y; this.viewMonth = m - 1;
      this.buildCells();
    }
  }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
}
