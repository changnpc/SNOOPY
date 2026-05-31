import { Component, OnInit, HostListener } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth.service';
import { EventsService } from '../../core/services/events.service';
import { TeamsService } from '../../core/services/teams.service';
import { ToastService } from '../../core/services/toast.service';
import { CalendarEvent, Team } from '../../models';
import { SelectOption } from '../../shared/components/ui-select/ui-select.component';

interface CalDay { date: Date | null; events: CalendarEvent[]; isToday: boolean; isOtherMonth: boolean; }

@Component({ selector: 'app-calendar', templateUrl: './calendar.component.html' })
export class CalendarComponent implements OnInit {
  year = new Date().getFullYear();
  month = new Date().getMonth();
  weeks: CalDay[][] = [];
  allEvents: CalendarEvent[] = [];
  teams: Team[] = [];
  selectedDay: CalDay | null = null;
  showModal = false;
  editingEvent: CalendarEvent | null = null;
  pendingRefId = '';   // ref_id from prefill (activity/practice)
  form!: FormGroup;
  saving = false;

  // Event popover
  popoverEvent: CalendarEvent | null = null;
  popoverX = 0;
  popoverY = 0;

  // Day overflow panel
  showMoreDay: CalDay | null = null;
  readonly thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  readonly enMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  readonly thDays = ['อา','จ','อ','พ','พฤ','ศ','ส'];
  readonly enDays = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  get isEn(): boolean { return this.langSvc.lang === 'en'; }
  get months(): string[] { return this.isEn ? this.enMonths : this.thMonths; }
  get dayHeaders(): string[] { return this.isEn ? this.enDays : this.thDays; }
  get yearLabel(): number { return this.isEn ? this.year : this.year + 543; }
  private get locale(): string { return this.isEn ? 'en-GB' : 'th-TH'; }

  constructor(public auth: AuthService, private evtSvc: EventsService, private teamsSvc: TeamsService, private toast: ToastService, private fb: FormBuilder, private router: Router, private langSvc: LanguageService) {}

  ngOnInit() {
    this.teamsSvc.getAll().subscribe((r: any) => { if (r.success) this.teams = r.data; });
    this.loadEvents();
    this.initForm();

    // Auto-open create modal when navigated here from Activity/Practice with prefill data
    const prefill = history.state?.prefillEvent;
    if (prefill) {
      this.editingEvent = null;
      this.pendingRefId = prefill.ref_id ?? '';
      this.initForm();
      this.form.patchValue({
        title:      prefill.title ?? '',
        start_date: prefill.start_date ?? '',
        end_date:   prefill.end_date ?? '',
        color:      prefill.color ?? '#0288d1',
        description: prefill.description ?? '',
        is_all_day: true,
        start_time: '00:00',
        end_time:   '00:00',
      });
      this.form.get('start_time')?.disable();
      this.form.get('end_time')?.disable();
      this.showModal = true;
      // Clear state so refreshing the page won't re-open the modal
      history.replaceState({}, '');
    }
  }

  loadEvents() {
    this.evtSvc.getAll().subscribe((r: any) => {
      this.allEvents = r.success ? r.data.filter((e: any) => e.title !== '[DELETED]') : [];
      this.buildCal();
    });
  }

  buildCal() {
    const first = new Date(this.year, this.month, 1);
    const last  = new Date(this.year, this.month+1, 0);
    const today = new Date(); today.setHours(0,0,0,0);
    const cells: CalDay[] = [];
    for (let i = 0; i < first.getDay(); i++) {
      const d = new Date(this.year, this.month, -first.getDay()+i+1);
      cells.push({ date: d, events: [], isToday: false, isOtherMonth: true });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(this.year, this.month, d);
      const dateStr = `${this.year}-${String(this.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const evs = this.allEvents.filter(e => e.start_datetime.slice(0,10) <= dateStr && e.end_datetime.slice(0,10) >= dateStr);
      cells.push({ date, events: evs, isToday: date.getTime() === today.getTime(), isOtherMonth: false });
    }
    const remain = (7 - cells.length % 7) % 7;
    for (let i = 1; i <= remain; i++) {
      const d = new Date(this.year, this.month+1, i);
      cells.push({ date: d, events: [], isToday: false, isOtherMonth: true });
    }
    this.weeks = [];
    for (let i = 0; i < cells.length; i += 7) this.weeks.push(cells.slice(i, i+7));
  }

  prev() { this.month--; if (this.month < 0) { this.month = 11; this.year--; } this.buildCal(); }
  next() { this.month++; if (this.month > 11) { this.month = 0; this.year++; } this.buildCal(); }
  today() { this.year = new Date().getFullYear(); this.month = new Date().getMonth(); this.buildCal(); }

  clickDay(day: CalDay) {
    if (!day.date || day.isOtherMonth) return;
    this.selectedDay = day;
    this.popoverEvent = null;
    if (!day.events.length && (this.auth.isAdmin || this.auth.isCoach)) this.openCreate(day.date);
  }

  clickEvent(ev: CalendarEvent, mouseEvent: MouseEvent) {
    mouseEvent.stopPropagation();
    if (this.popoverEvent?.event_id === ev.event_id) { this.popoverEvent = null; return; }
    const rect = (mouseEvent.target as HTMLElement).getBoundingClientRect();
    const popW = 320;
    const spaceRight = window.innerWidth - rect.right;
    this.popoverX = spaceRight >= popW + 8 ? rect.right + 8 : rect.left - popW - 8;
    this.popoverY = Math.min(rect.top, window.innerHeight - 300);
    this.popoverEvent = ev;
  }

  closePopover() { this.popoverEvent = null; }
  showMore(day: CalDay, e: MouseEvent) { e.stopPropagation(); this.showMoreDay = day; this.popoverEvent = null; }

  @HostListener('document:keydown.escape')
  onEsc() { this.popoverEvent = null; this.showMoreDay = null; }

  private toLocalDate(dt: string): string { return dt ? dt.slice(0,10) : ''; }
  private toLocalTime(dt: string): string { return dt ? (dt.slice(11,16) || '00:00') : ''; }
  private combineDT(date: string, time: string): string { return date && time ? `${date}T${time}` : date; }

  initForm(ev?: CalendarEvent) {
    const startDt = ev?.start_datetime ?? '';
    const endDt   = ev?.end_datetime ?? '';
    this.form = this.fb.group({
      title:       [ev?.title ?? '', Validators.required],
      description: [ev?.description ?? ''],
      start_date:  [this.toLocalDate(startDt), Validators.required],
      start_time:  [this.toLocalTime(startDt) || '14:00'],
      end_date:    [this.toLocalDate(endDt), Validators.required],
      end_time:    [this.toLocalTime(endDt) || '17:00'],
      color:       [ev?.color ?? '#0288d1'],
      team_id:     [ev?.team_id ?? ''],
      is_all_day:  [String(ev?.is_all_day).toUpperCase() === 'TRUE'],
    }, { validators: this.endNotBeforeStart() });
  }

  private endNotBeforeStart(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const startDate = group.get('start_date')?.value as string;
      const endDate   = group.get('end_date')?.value as string;
      const startTime = group.get('start_time')?.value as string || '00:00';
      const endTime   = group.get('end_time')?.value as string || '00:00';
      if (!startDate || !endDate) return null;
      const start = new Date(`${startDate}T${startTime}`);
      const end   = new Date(`${endDate}T${endTime}`);
      return end < start ? { endBeforeStart: true } : null;
    };
  }

  get endBeforeStartError(): boolean { return !!this.form?.errors?.['endBeforeStart']; }

  openCreate(date?: Date) {
    this.popoverEvent = null;
    this.editingEvent = null;
    const d = date ?? new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    this.initForm();
    this.form.patchValue({ start_date: dateStr, end_date: dateStr, start_time: '14:00', end_time: '17:00' });
    this.showModal = true;
  }
  openEdit(ev: CalendarEvent) {
    this.popoverEvent = null;
    this.editingEvent = ev;
    this.initForm(ev);
    setTimeout(() => this.onAllDayChange(), 0);
    this.showModal = true;
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    const data = {
      ...v,
      start_datetime: this.combineDT(v.start_date, v.start_time),
      end_datetime:   this.combineDT(v.end_date, v.end_time),
    };
    delete data['start_date']; delete data['start_time'];
    delete data['end_date'];   delete data['end_time'];
    if (!this.editingEvent && this.pendingRefId) {
      data['ref_id'] = this.pendingRefId;
    }
    const obs = this.editingEvent ? this.evtSvc.update(this.editingEvent.event_id, data) : this.evtSvc.create(data);
    obs.subscribe({
      next: () => { this.toast.success(this.editingEvent ? 'แก้ไขกิจกรรมสำเร็จ' : 'สร้างกิจกรรมสำเร็จ'); this.showModal = false; this.saving = false; this.pendingRefId = ''; this.loadEvents(); },
      error: () => { this.saving = false; }
    });
  }

  delete(ev: CalendarEvent) {
    if (!confirm('ลบกิจกรรมนี้?')) return;
    this.evtSvc.delete(ev.event_id).subscribe({ next: () => { this.toast.warning('ลบกิจกรรมแล้ว'); this.selectedDay = null; this.loadEvents(); } });
  }

  onAllDayChange() {
    const allDay = this.form.get('is_all_day')?.value;
    if (allDay) {
      this.form.patchValue({ start_time: '00:00', end_time: '00:00' });
      this.form.get('start_time')?.disable();
      this.form.get('end_time')?.disable();
    } else {
      this.form.get('start_time')?.enable();
      this.form.get('end_time')?.enable();
    }
  }

  get teamOptions(): SelectOption[] {
    return [{ value: '', label: this.langSvc.translate('ทุกทีม') }, ...this.teams.map(t => ({ value: t.team_id, label: t.team_name }))];
  }

  isAllDay(ev: CalendarEvent): boolean { return String((ev as any).is_all_day).toUpperCase() === 'TRUE'; }
  formatDt(dt: string) { return new Date(dt).toLocaleString(this.locale, { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }
  formatLong(d?: Date | null) { return d ? d.toLocaleDateString(this.locale, { year:'numeric', month:'long', day:'numeric' }) : ''; }
}
