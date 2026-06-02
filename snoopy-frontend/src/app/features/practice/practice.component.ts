import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PracticeService } from '../../core/services/practice.service';
import { TeamsService } from '../../core/services/teams.service';
import { CrudModalController, CrudLabels } from '../../core/base/crud-modal.controller';
import { PracticeLink, Team, ApiResponse } from '../../models';
import { SelectOption } from '../../shared/components/ui-select/ui-select.component';

interface GroupedLinks {
  date: string;
  links: PracticeLink[];
}

@Component({
  selector: 'app-practice',
  templateUrl: './practice.component.html',
})
export class PracticeComponent extends CrudModalController<PracticeLink> {
  groups: GroupedLinks[] = [];
  historyGroups: GroupedLinks[] = [];
  teams: Team[] = [];
  tab: 'current' | 'history' = 'current';
  deletingId: string | null = null;

  // History filter + sort state
  historyFilterYear  = '';
  historyFilterMonth = '';
  historySortAsc     = false; // default: newest first

  get teamOptions(): SelectOption[] {
    return this.teams.map(t => ({ value: t.team_id, label: t.team_name }));
  }

  /** Distinct year-month combos available in history, newest first. */
  get historyYearMonths(): { year: string; month: string; label: string }[] {
    const seen = new Set<string>();
    const out: { year: string; month: string; label: string }[] = [];
    for (const g of [...this.historyGroups].sort((a, b) => b.date.localeCompare(a.date))) {
      const [y, m] = g.date.split('-');
      const key = `${y}-${m}`;
      if (!seen.has(key)) {
        seen.add(key);
        const d = new Date(`${y}-${m}-01`);
        const label = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
        out.push({ year: y, month: m, label });
      }
    }
    return out;
  }

  get activeGroups(): GroupedLinks[] {
    if (this.tab === 'current') return this.groups;
    let filtered = this.historyGroups;
    if (this.historyFilterYear && this.historyFilterMonth) {
      filtered = filtered.filter(g =>
        g.date.startsWith(`${this.historyFilterYear}-${this.historyFilterMonth}`)
      );
    }
    return [...filtered].sort((a, b) =>
      this.historySortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
    );
  }

  selectHistoryPeriod(year: string, month: string): void {
    this.historyFilterYear  = year;
    this.historyFilterMonth = month;
  }
  clearHistoryFilter(): void {
    this.historyFilterYear  = '';
    this.historyFilterMonth = '';
  }
  toggleHistorySort(): void { this.historySortAsc = !this.historySortAsc; }

  constructor(
    public auth: AuthService,
    private svc: PracticeService,
    private teamsSvc: TeamsService,
    private fb: FormBuilder,
    private router: Router,
  ) { super(); }

  override ngOnInit(): void {
    this.teamsSvc.getAll().subscribe((r: any) => { if (r.success) this.teams = r.data; });
    super.ngOnInit();         // builds form + calls load()
    this.loadHistory();
  }

  // ── CRUD hooks ──────────────────────────────────────────
  protected entityId(l: PracticeLink): string { return l.link_id; }
  protected fetch(): Observable<ApiResponse<PracticeLink[]>> { return this.svc.getCurrent() as any; }
  protected createReq(p: unknown) { return this.svc.create(p as any); }
  protected updateReq(id: string, p: unknown) { return this.svc.update(id, p as any); }
  protected deleteReq(id: string) { return this.svc.delete(id); }

  protected override toPayload(v: any): any {
    return { ...v, team_id: v.team_id || null };
  }

  protected labels: CrudLabels = {
    createOk: 'เพิ่มลิงก์ซ้อมสำเร็จ', updateOk: 'แก้ไขลิงก์ซ้อมสำเร็จ',
    deleteOk: 'ลบลิงก์ซ้อมแล้ว', deleteTitle: 'ลบลิงก์ซ้อม', deleteConfirm: 'ลบ',
    error: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
  };

  protected buildForm(l?: PracticeLink): FormGroup {
    const today = new Date().toISOString().slice(0, 10);
    return this.fb.group({
      practice_date: [l?.practice_date?.slice(0, 10) ?? today, Validators.required],
      team_id:       [l?.team_id ?? ''],
      section:       [l?.section ?? 'A', Validators.required],
      player_link:   [l?.player_link ?? '', Validators.required],
      coach_link:    [l?.coach_link ?? ''],
      note:          [l?.note ?? ''],
    });
  }

  /** Current links list is grouped by date for display. */
  override load(): void {
    this.loading = true;
    this.svc.getCurrent().subscribe({
      next: (r: any) => { this.groups = this.group(r.success ? r.data : []); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadHistory(): void {
    this.svc.getHistory().subscribe({
      next: (r: any) => { this.historyGroups = this.group(r.success ? r.data : []); },
      error: () => {},
    });
  }

  private group(links: PracticeLink[]): GroupedLinks[] {
    const map = new Map<string, PracticeLink[]>();
    for (const l of links) {
      const d = l.practice_date.slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(l);
    }
    // Ascending: nearest date first (matches backend sort).
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, ls]) => ({ date, links: ls.sort((a, b) => a.section.localeCompare(b.section)) }));
  }

  /** After creating a link, jump to calendar with a prefilled practice event. */
  protected override afterSave(res: any, isCreate: boolean): void {
    this.loadHistory();
    if (!isCreate) return;
    const v = this.form.value;
    const teamName = v.team_id ? (this.teams.find(t => t.team_id === v.team_id)?.team_name ?? v.team_id) : '';
    this.router.navigate(['/calendar'], {
      state: {
        prefillEvent: {
          title: `ซ้อม${v.team_id ? ' ' + teamName : ''} (Section ${v.section})`,
          start_date: v.practice_date, end_date: v.practice_date,
          is_all_day: true, color: '#388e3c',
          description: v.note ?? '', ref_id: res?.data?.link_id ?? '',
        },
      },
    });
  }

  /** Custom delete to keep the per-row deleting spinner + history refresh. */
  delete(l: PracticeLink): void {
    this.confirm.confirm({
      title: this.lang.translate('ลบลิงก์ซ้อม'),
      message: `Section ${l.section} · ${l.practice_date?.slice(0, 10)}`,
      confirmLabel: this.lang.translate('ลบ'), danger: true,
    }).subscribe(ok => {
      if (!ok) return;
      this.deletingId = l.link_id;
      this.svc.delete(l.link_id).subscribe({
        next: () => { this.toast.warning(this.lang.translate('ลบลิงก์ซ้อมแล้ว')); this.deletingId = null; this.load(); this.loadHistory(); },
        error: () => { this.deletingId = null; },
      });
    });
  }

  trackByGroupDate(_: number, g: GroupedLinks): string { return g.date; }
  trackByLinkId(_: number, l: PracticeLink): string { return l.link_id; }

  // Each session index gets a distinct on-theme color (cycles if > 4)
  private readonly SESSION_COLORS = [
    { bg: 'linear-gradient(135deg,#2d7dd2,#5ba3e8)', btn: '#2d7dd2' }, // primary blue
    { bg: 'linear-gradient(135deg,#2e7d32,#4caf50)', btn: '#2e7d32' }, // success green
    { bg: 'linear-gradient(135deg,#e65100,#ff8a65)', btn: '#e65100' }, // warm orange
    { bg: 'linear-gradient(135deg,#6a1b9a,#ab47bc)', btn: '#6a1b9a' }, // bridge purple
  ];
  sessionColor(index: number): { bg: string; btn: string } {
    return this.SESSION_COLORS[index % this.SESSION_COLORS.length];
  }
}
