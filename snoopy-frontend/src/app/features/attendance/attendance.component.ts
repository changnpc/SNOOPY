import { Component, OnInit } from '@angular/core';
import { SelectOption } from '../../shared/components/ui-select/ui-select.component';
import { AuthService } from '../../core/services/auth.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { TeamsService } from '../../core/services/teams.service';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { LanguageService } from '../../core/services/language.service';
import { Team, User, AttendanceRecord } from '../../models';

interface PlayerRow { user: User; status: string; note: string; }

@Component({ selector: 'app-attendance', templateUrl: './attendance.component.html' })
export class AttendanceComponent implements OnInit {
  activeTab: 'sheet' | 'history' = 'sheet';
  loading = true;
  saving = false;

  teams: Team[] = [];
  selectedDate = new Date().toISOString().slice(0,10);
  selectedTeamId = '';

  get teamOptions(): SelectOption[] {
    return this.teams.map(t => ({ value: t.team_id, label: t.team_name }));
  }

  players: PlayerRow[] = [];
  history: AttendanceRecord[] = [];
  histFilter = { date_from: '', date_to: '' };
  userMap: Record<string, string> = {};

  get summary() {
    return {
      present: this.players.filter(p => p.status === 'Present').length,
      absent:  this.players.filter(p => p.status === 'Absent').length,
      leave:   this.players.filter(p => p.status === 'Leave').length,
      none:    this.players.filter(p => !p.status).length,
    };
  }

  constructor(
    public auth: AuthService,
    private attSvc: AttendanceService,
    private teamsSvc: TeamsService,
    private usersSvc: UsersService,
    private toast: ToastService,
    private langSvc: LanguageService
  ) {}

  ngOnInit() {
    // Build a user_id → display name map (for history table)
    this.usersSvc.getAll().subscribe((r: any) => {
      if (r.success) {
        (r.data as User[]).forEach(u => {
          this.userMap[u.user_id] = `${u.th_prefix ?? ''}${u.th_first_name} ${u.th_last_name}`.trim();
        });
      }
    });
    this.teamsSvc.getAll().subscribe((res: any) => {
      if (res.success) {
        this.teams = res.data;
        if (this.auth.isCoach) this.selectedTeamId = this.auth.teamId ?? '';
        else if (this.teams.length) this.selectedTeamId = this.teams[0].team_id;
        this.loadSheet();
      }
    });
  }

  getName(id: string): string { return this.userMap[id] ?? id; }

  loadSheet() {
    if (!this.selectedTeamId) return;
    this.loading = true;
    this.usersSvc.getAll({ team_id: this.selectedTeamId, role: 'Player', is_active: true }).subscribe((ur: any) => {
      const users: User[] = ur.success ? ur.data : [];
      this.attSvc.getSheet(this.selectedDate, this.selectedTeamId).subscribe({
        next: (ar: any) => {
          const records: AttendanceRecord[] = ar.success ? ar.data : [];
          this.players = users.map(u => {
            const rec = records.find(r => r.player_id === u.user_id);
            return { user: u, status: rec?.status ?? '', note: rec?.note ?? '' };
          });
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
    });
  }

  setStatus(row: PlayerRow, status: string) {
    row.status = row.status === status ? '' : status;
  }

  setAll(status: string) {
    this.players.forEach(p => { if (!p.status || p.status !== 'Leave') p.status = status; });
  }

  saveAll() {
    const toSave = this.players.filter(p => p.status);
    if (!toSave.length) { this.toast.warning('ยังไม่มีการเช็กชื่อ'); return; }
    this.saving = true;
    const records = toSave.map(p => ({
      date: this.selectedDate, player_id: p.user.user_id, team_id: this.selectedTeamId,
      status: p.status, note: p.note,
    }));
    // One request for the whole team — server does 1 read + 2 writes.
    this.attSvc.batchUpsert(records).subscribe({
      next: () => { this.saving = false; this.toast.success('บันทึกการเช็กชื่อสำเร็จ'); },
      error: () => { this.saving = false; this.toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่'); }
    });
  }

  loadHistory() {
    this.attSvc.getHistory({ team_id: this.selectedTeamId, ...this.histFilter }).subscribe((res: any) => {
      this.history = res.success ? res.data : [];
    });
  }

  getStatusLabel(s: string) { return this.langSvc.translate(s === 'Present' ? 'มา' : s === 'Absent' ? 'ขาด' : s === 'Leave' ? 'ลา' : 'ยังไม่เช็ก'); }
  getStatusClass(s: string) { return s === 'Present' ? 'att-present' : s === 'Absent' ? 'att-absent' : s === 'Leave' ? 'att-leave' : 'att-none'; }

  // ─── trackBy helpers ──────────────────────────────────────
  trackByPlayerId(_: number, p: PlayerRow): string { return p.user.user_id; }
  trackByAttendanceId(_: number, r: AttendanceRecord): string { return r.attendance_id; }
}
