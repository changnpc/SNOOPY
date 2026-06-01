import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CompetitionsService } from '../../core/services/competitions.service';
import { UsersService } from '../../core/services/users.service';
import { TeamsService } from '../../core/services/teams.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CompetitionResult, CompetitionResultStatus, User, Team } from '../../models';

@Component({
  selector: 'app-competitions',
  templateUrl: './competitions.component.html',
})
export class CompetitionsComponent implements OnInit {
  results: CompetitionResult[] = [];
  pendingResults: CompetitionResult[] = [];
  athletes: User[] = [];
  teams: Team[] = [];
  loading = true;
  activeTab: 'my' | 'pending' = 'my';

  showModal = false;
  saving = false;
  form!: FormGroup;

  // Athlete picker state
  athleteSearch = '';
  athleteTeamFilter = '';
  athletePickerOpen = false;
  selectedAthlete: User | null = null;

  // Award picker state
  awardPickerOpen = false;

  readonly awardOptions = ['Gold', 'Silver', 'Bronze', 'Special', 'เข้าร่วม'];

  readonly awardIconMap: Record<string, string> = {
    Gold: 'workspace_premium',
    Silver: 'workspace_premium',
    Bronze: 'workspace_premium',
    Special: 'military_tech',
    'เข้าร่วม': 'emoji_events',
  };

  constructor(
    public auth: AuthService,
    private svc: CompetitionsService,
    private usersSvc: UsersService,
    private teamsSvc: TeamsService,
    private fb: FormBuilder,
    private toast: ToastService,
    private elRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.load();
    if (this.auth.isAdmin) {
      this.usersSvc.getAll({ role: 'Player', is_active: true }).subscribe({
        next: (res: any) => { if (res.success) this.athletes = res.data; },
      });
      this.teamsSvc.getAll().subscribe({
        next: (res: any) => { if (res.success) this.teams = res.data.filter((t: Team) => !t.parent_team_id); },
      });
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      competition_name: ['', Validators.required],
      date_from:        [''],
      date_to:          [''],
      category:         ['', Validators.required],
      rank:             [''],
      award:            [''],
      score:            [''],
      user_id:          [''],
    });
    this.selectedAthlete = null;
    this.athleteSearch = '';
    this.athleteTeamFilter = '';
  }

  load(): void {
    this.loading = true;
    this.svc.getMyResults().subscribe({
      next: res => { if (res.success) this.results = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
    if (this.auth.isAdmin) {
      this.svc.getPendingResults().subscribe({
        next: res => { if (res.success) this.pendingResults = res.data; },
      });
    }
  }

  openModal(): void { this.initForm(); this.showModal = true; }
  closeModal(): void { this.showModal = false; this.athletePickerOpen = false; }

  // ── Athlete picker ──────────────────────────────────────────────────────────
  get filteredAthletes(): User[] {
    let list = this.athletes;
    if (this.athleteTeamFilter) list = list.filter(a => a.team_id === this.athleteTeamFilter);
    const q = this.athleteSearch.trim().toLowerCase();
    if (q) list = list.filter(a =>
      `${a.th_first_name}${a.th_last_name}${a.en_first_name}${a.en_last_name}`.toLowerCase().includes(q)
    );
    return list;
  }

  selectAthlete(a: User): void {
    this.selectedAthlete = a;
    this.form.patchValue({ user_id: a.user_id });
    this.athletePickerOpen = false;
  }

  selectAward(val: string): void {
    const current = this.form.value.award;
    this.form.patchValue({ award: current === val ? '' : val });
    this.awardPickerOpen = false;
  }

  clearAthlete(): void {
    this.selectedAthlete = null;
    this.form.patchValue({ user_id: '' });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(e.target)) {
      this.athletePickerOpen = false;
      this.awardPickerOpen = false;
    }
  }

  // ── Form submit ─────────────────────────────────────────────────────────────
  submit(): void {
    if (this.form.invalid) return;
    if (this.auth.isAdmin && !this.form.value.user_id) {
      this.toast.error('กรุณาเลือกนักกีฬา');
      return;
    }
    this.saving = true;
    const payload = { ...this.form.value };
    if (!this.auth.isAdmin) payload.user_id = this.auth.currentUser?.user_id;
    this.svc.createResult(payload).subscribe({
      next: res => {
        if (res.success) {
          const msg = this.auth.isAdmin ? 'บันทึกผลการแข่งขันสำเร็จ' : 'ส่งคำขอสำเร็จ รอ Admin อนุมัติ';
          this.toast.success(msg);
          this.closeModal();
          this.load();
        }
        this.saving = false;
      },
      error: () => { this.saving = false; this.toast.error('เกิดข้อผิดพลาด'); },
    });
  }

  approve(id: string): void {
    this.svc.approveResult(id).subscribe({
      next: () => { this.toast.success('อนุมัติแล้ว'); this.load(); },
    });
  }

  reject(id: string): void {
    this.svc.rejectResult(id).subscribe({
      next: () => { this.toast.warning('ปฏิเสธแล้ว'); this.load(); },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  displayName(r: CompetitionResult): string { return r.competition_name || r.competition_id || ''; }

  awardIcon(award: string): string {
    return this.awardIconMap[award] ?? 'emoji_events';
  }

  awardIconColor(award: string): string {
    return award === 'Gold' ? '#f59e0b' : award === 'Silver' ? '#94a3b8'
      : award === 'Bronze' ? '#b45309' : 'var(--primary)';
  }

  awardClass(award: string): string {
    return award === 'Gold' ? 'badge-gold' : award === 'Silver' ? 'badge-silver'
      : award === 'Bronze' ? 'badge-bronze' : award === 'Special' ? 'badge-special'
      : 'badge-outline';
  }

  statusClass(s: CompetitionResultStatus): string {
    return s === 'Approved' ? 'badge-success' : s === 'Rejected' ? 'badge-danger' : 'badge-warning';
  }

  athleteFullName(u: User): string {
    return `${u.th_prefix ?? ''}${u.th_first_name} ${u.th_last_name}`;
  }

  athleteName(id: string): string {
    const u = this.athletes.find(a => a.user_id === id);
    return u ? this.athleteFullName(u) : id;
  }

  trackByResult(_: number, r: CompetitionResult): string { return r.result_id; }
  trackByUser(_: number, u: User): string { return u.user_id; }
  trackByTeam(_: number, t: Team): string { return t.team_id; }
}
