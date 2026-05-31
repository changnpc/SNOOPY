import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TeamsService } from '../../core/services/teams.service';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { Team, User } from '../../models';
import { SelectOption } from '../../shared/components/ui-select/ui-select.component';
import { forkJoin } from 'rxjs';
import { LanguageService } from '../../core/services/language.service';

interface TeamWithMembers extends Team { members: User[]; }

@Component({ selector: 'app-teams', templateUrl: './teams.component.html' })
export class TeamsComponent implements OnInit {
  loading = true;
  allUsers: User[] = [];
  teams: TeamWithMembers[] = [];      // big teams only
  allSubTeams: Team[] = [];           // all active sub-teams

  // Create/Edit Big Team Modal
  showModal = false;
  editing: Team | null = null;
  form!: FormGroup;
  saving = false;

  // Create Sub-team Modal
  showSubModal = false;
  editingSubTeam: Team | null = null;
  subForm!: FormGroup;
  subSaving = false;

  // Team Detail Modal
  showDetail = false;
  detailTeam: TeamWithMembers | null = null;
  detailTab: 'members' | 'subteams' = 'members';

  // Add Member to big team
  showAddPanel = false;
  addSearch = '';
  addingSaving = false;

  // Assign sub-team for a member
  assigningUser: User | null = null;
  assignSubTeamId = '';

  constructor(
    public auth: AuthService,
    private teamsSvc: TeamsService,
    private usersSvc: UsersService,
    private toast: ToastService,
    private fb: FormBuilder,
    public langSvc: LanguageService
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    forkJoin({
      bigTeams: this.teamsSvc.getAllIncludingSub(),
      users:    this.usersSvc.getAll(),
    }).subscribe((res: any) => {
      const allTeams: Team[] = res.bigTeams.success ? res.bigTeams.data : [];
      this.allUsers = res.users.success ? res.users.data : [];

      // Separate big teams vs sub-teams
      this.allSubTeams = allTeams.filter(t => !!t.parent_team_id);
      const bigTeams   = allTeams.filter(t => !t.parent_team_id);

      const order = ['U16', 'U21', 'U26'];
      const sorted = [...bigTeams].sort((a, b) => {
        const ia = order.indexOf(a.team_name), ib = order.indexOf(b.team_name);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1; if (ib !== -1) return 1;
        return a.team_name.localeCompare(b.team_name);
      });

      this.teams = sorted.map(t => ({
        ...t,
        members: this.allUsers.filter(u =>
          u.team_id === t.team_id &&
          String(u.is_active).toUpperCase() === 'TRUE'
        ),
      }));

      // Refresh detail modal if open
      if (this.detailTeam) {
        this.detailTeam = this.teams.find(t => t.team_id === this.detailTeam!.team_id) ?? null;
      }
      this.loading = false;
    });
  }

  // ── Sub-team helpers ─────────────────────────────────────────
  getSubTeamsOf(parentId: string): Team[] {
    return this.allSubTeams.filter(s => s.parent_team_id === parentId);
  }

  get assignSubTeamOptions(): SelectOption[] {
    if (!this.detailTeam) return [];
    return this.getSubTeamsOf(this.detailTeam.team_id).map(s => ({ value: s.team_id, label: s.team_name }));
  }

  // Count members in a sub-team from ALL users (works in card context)
  countInSubTeam(subTeamId: string): number {
    return this.allUsers.filter(u =>
      u.sub_team_id === subTeamId &&
      String(u.is_active).toUpperCase() === 'TRUE'
    ).length;
  }

  // Members of sub-team scoped to the detail team (for detail modal)
  getMembersOfSubTeam(subTeamId: string): User[] {
    return (this.detailTeam?.members ?? []).filter(u => u.sub_team_id === subTeamId);
  }

  getMembersNoSubTeam(): User[] {
    return (this.detailTeam?.members ?? []).filter(u => !u.sub_team_id);
  }

  getSubTeamName(subTeamId?: string): string {
    if (!subTeamId) return '';
    return this.allSubTeams.find(s => s.team_id === subTeamId)?.team_name ?? subTeamId;
  }

  // ── Big Team CRUD ────────────────────────────────────────────
  initForm(t?: Team) {
    this.form = this.fb.group({
      team_name:   [t?.team_name ?? '', Validators.required],
      description: [t?.description ?? ''],
      is_active:   [t?.is_active !== false],
    });
  }

  openCreate() { this.editing = null; this.initForm(); this.showModal = true; }
  openEdit(t: Team, e: Event) { e.stopPropagation(); this.editing = t; this.initForm(t); this.showModal = true; }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const obs = this.editing
      ? this.teamsSvc.update(this.editing.team_id, this.form.value)
      : this.teamsSvc.create(this.form.value);
    obs.subscribe({
      next: () => { this.toast.success(this.editing ? 'แก้ไขทีมสำเร็จ' : 'สร้างทีมสำเร็จ'); this.showModal = false; this.saving = false; this.load(); },
      error: () => { this.saving = false; }
    });
  }

  delete(t: Team, e: Event) {
    e.stopPropagation();
    if (!confirm(`ลบทีม "${t.team_name}"?`)) return;
    this.teamsSvc.delete(t.team_id).subscribe({
      next: () => { this.toast.warning('ลบทีมแล้ว'); this.load(); },
      error: (err) => { this.toast.error(err.error?.error?.message ?? 'ไม่สามารถลบได้ (มีสมาชิกหรือทีมย่อยอยู่)'); }
    });
  }

  // ── Sub-team CRUD ────────────────────────────────────────────
  initSubForm(s?: Team) {
    this.subForm = this.fb.group({
      team_name:   [s?.team_name ?? '', Validators.required],
      description: [s?.description ?? ''],
    });
  }

  openCreateSubTeam() {
    if (!this.detailTeam) return;
    this.editingSubTeam = null;
    this.initSubForm();
    this.showSubModal = true;
  }

  openEditSubTeam(s: Team, e: Event) {
    e.stopPropagation();
    this.editingSubTeam = s;
    this.initSubForm(s);
    this.showSubModal = true;
  }

  saveSubTeam() {
    if (!this.detailTeam || this.subForm.invalid) return;
    this.subSaving = true;
    const obs = this.editingSubTeam
      ? this.teamsSvc.update(this.editingSubTeam.team_id, this.subForm.value)
      : this.teamsSvc.create({ ...this.subForm.value, parent_team_id: this.detailTeam.team_id });
    obs.subscribe({
      next: () => {
        this.toast.success(this.editingSubTeam ? 'แก้ไขทีมย่อยสำเร็จ' : 'สร้างทีมย่อยสำเร็จ');
        this.showSubModal = false; this.subSaving = false; this.load();
      },
      error: (err) => { this.subSaving = false; this.toast.error(err.error?.error?.message ?? 'เกิดข้อผิดพลาด'); }
    });
  }

  deleteSubTeam(s: Team, e: Event) {
    e.stopPropagation();
    if (!confirm(`ลบทีมย่อย "${s.team_name}"?`)) return;
    this.teamsSvc.delete(s.team_id).subscribe({
      next: () => { this.toast.warning('ลบทีมย่อยแล้ว'); this.load(); },
      error: (err) => { this.toast.error(err.error?.error?.message ?? 'ไม่สามารถลบได้ (มีสมาชิกอยู่)'); }
    });
  }

  // ── Team Detail Modal ────────────────────────────────────────
  openDetail(t: TeamWithMembers) {
    this.detailTeam = t;
    this.showDetail = true;
    this.detailTab = 'members';
    this.showAddPanel = false;
    this.addSearch = '';
    this.assigningUser = null;
  }

  closeDetail() { this.showDetail = false; this.detailTeam = null; }

  // ── Add / Remove Member (big team) ───────────────────────────
  get availableUsers(): User[] {
    if (!this.detailTeam) return [];
    const q = this.addSearch.toLowerCase();
    return this.allUsers.filter(u =>
      u.team_id !== this.detailTeam!.team_id &&
      String(u.is_active).toUpperCase() === 'TRUE' &&
      u.role !== 'Super Admin' &&
      (!q || `${u.th_first_name} ${u.th_last_name} ${u.en_first_name} ${u.en_last_name}`.toLowerCase().includes(q))
    );
  }

  addMember(u: User) {
    if (!this.detailTeam) return;
    this.addingSaving = true;
    const fd = new FormData();
    fd.append('team_id', this.detailTeam.team_id);
    fd.append('sub_team_id', 'null');
    this.usersSvc.update(u.user_id, fd).subscribe({
      next: () => { this.toast.success(`เพิ่ม ${u.th_first_name} เข้าทีมแล้ว`); this.addingSaving = false; this.load(); },
      error: () => { this.addingSaving = false; }
    });
  }

  removeMember(u: User) {
    if (!confirm(`ลบ ${u.th_first_name} ออกจากทีม?`)) return;
    const fd = new FormData();
    fd.append('team_id', 'null');
    fd.append('sub_team_id', 'null');
    this.usersSvc.update(u.user_id, fd).subscribe({
      next: () => { this.toast.warning(`ลบ ${u.th_first_name} ออกจากทีมแล้ว`); this.load(); },
    });
  }

  // ── Assign / Remove Sub-team ─────────────────────────────────
  openAssign(u: User) {
    this.assigningUser = u;
    this.assignSubTeamId = u.sub_team_id ?? '';
  }

  confirmAssign() {
    if (!this.assigningUser) return;
    const fd = new FormData();
    fd.append('sub_team_id', this.assignSubTeamId || 'null');
    this.usersSvc.update(this.assigningUser.user_id, fd).subscribe({
      next: () => {
        const name = this.assigningUser!.th_first_name;
        const subName = this.assignSubTeamId ? this.getSubTeamName(this.assignSubTeamId) : '-';
        this.toast.success(`กำหนดทีมย่อยให้ ${name}: ${subName}`);
        this.assigningUser = null;
        this.load();
      },
      error: () => { this.toast.error('เกิดข้อผิดพลาด'); }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  getCoaches(t: TeamWithMembers) { return t.members.filter(u => u.role === 'Coach'); }
  getPlayers(t: TeamWithMembers) { return t.members.filter(u => u.role === 'Player'); }
  t(key: string) { return this.langSvc.translate(key); }
  membersLabel(n: number) { return this.langSvc.lang === 'en' ? `${n} members` : `สมาชิกทั้งหมด ${n} คน`; }
  moreLabel(n: number)    { return this.langSvc.lang === 'en' ? `+${n} more` : `และอีก ${n} คน`; }
  subteamCountLabel(n: number) { return this.langSvc.lang === 'en' ? `${n} sub-teams` : `${n} ทีมย่อย`; }
  memberCountLabel(n: number) { return this.langSvc.lang === 'en' ? `${n} members` : `${n} คน`; }
  noDescLabel() { return this.langSvc.lang === 'en' ? 'No description' : 'ไม่มีคำอธิบาย'; }
  subteamInLabel(name: string) { return this.langSvc.lang === 'en' ? `Sub-teams in ${name}` : `ทีมย่อยใน ${name}`; }
  mainTeamLabel() { return this.langSvc.lang === 'en' ? 'Main team' : 'ทีมใหญ่'; }
  detailSummaryLabel(team: TeamWithMembers) {
    const n = team.members.length, c = this.getCoaches(team).length, p = this.getPlayers(team).length, s = this.getSubTeamsOf(team.team_id).length;
    return this.langSvc.lang === 'en'
      ? `${n} members · ${c} coaches · ${p} players · ${s} sub-teams`
      : `สมาชิก ${n} คน · โค้ช ${c} · นักกีฬา ${p} · ทีมย่อย ${s} ทีม`;
  }

  // ─── trackBy helpers ──────────────────────────────────────
  trackByTeamId(_: number, t: Team): string { return t.team_id; }
  trackByUserId(_: number, u: User): string { return u.user_id; }
}
