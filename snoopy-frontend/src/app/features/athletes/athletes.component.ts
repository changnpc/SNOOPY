import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';
import { TeamsService } from '../../core/services/teams.service';
import { ToastService } from '../../core/services/toast.service';
import { User, Team } from '../../models';
import { SelectOption } from '../../shared/components/ui-select/ui-select.component';

@Component({
  selector: 'app-athletes',
  templateUrl: './athletes.component.html',
})
export class AthletesComponent implements OnInit {
  loading = true;
  users: User[] = [];
  filtered: User[] = [];
  teams: Team[] = [];

  allSubTeams: Team[] = [];
  search = '';
  teamFilter = '';
  subTeamFilter = '';

  showModal = false;
  showDetailModal = false;
  selectedUser: User | null = null;
  form!: FormGroup;
  saving = false;

  constructor(
    public auth: AuthService,
    private usersSvc: UsersService,
    private teamsSvc: TeamsService,
    private toast: ToastService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.teamsSvc.getAllIncludingSub().subscribe((res: any) => {
      if (res.success) {
        const order = ['U16', 'U21', 'U26'];
        const allTeams = res.data;
        this.allSubTeams = allTeams.filter((t: any) => !!t.parent_team_id);
        this.teams = allTeams
          .filter((t: any) => !t.parent_team_id)
          .sort((a: any, b: any) => {
            const ia = order.indexOf(a.team_name);
            const ib = order.indexOf(b.team_name);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.team_name.localeCompare(b.team_name);
          });
      }
    });
    this.loadUsers();
    this.initForm();
  }

  loadUsers() {
    this.loading = true;
    this.usersSvc.getAll({ role: 'Player' }).subscribe({
      next: (res: any) => {
        this.users = res.success ? res.data : [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() {
    let result = [...this.users];
    if (this.search) {
      const q = this.search.toLowerCase();
      result = result.filter(u =>
        u.th_first_name.toLowerCase().includes(q) ||
        u.th_last_name.toLowerCase().includes(q) ||
        u.en_first_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    if (this.teamFilter)    result = result.filter(u => u.team_id === this.teamFilter);
    if (this.subTeamFilter) result = result.filter(u => u.sub_team_id === this.subTeamFilter);
    this.filtered = result;
  }

  selectTeam(teamId: string) {
    this.teamFilter = teamId;
    this.subTeamFilter = '';
    this.applyFilter();
  }

  selectSubTeam(subTeamId: string) {
    this.subTeamFilter = subTeamId;
    this.applyFilter();
  }

  countInTeam(teamId: string): number {
    return this.users.filter(u => u.team_id === teamId).length;
  }

  countInSubTeam(subTeamId: string): number {
    return this.users.filter(u => u.sub_team_id === subTeamId).length;
  }

  getSubTeamsOf(parentId: string) {
    return this.allSubTeams.filter(s => s.parent_team_id === parentId);
  }

  get teamSelectOptions(): SelectOption[] {
    return this.teams.map(t => ({ value: t.team_id, label: t.team_name }));
  }

  get subTeamSelectOptions(): SelectOption[] {
    const teamId = this.form?.get('team_id')?.value;
    if (!teamId) return [];
    return this.getSubTeamsOf(teamId).map(s => ({ value: s.team_id, label: s.team_name }));
  }

  getSubTeamName(subTeamId?: string): string {
    if (!subTeamId) return '';
    return this.allSubTeams.find(s => s.team_id === subTeamId)?.team_name ?? '';
  }

  initForm(user?: User) {
    this.form = this.fb.group({
      th_prefix:     [user?.th_prefix ?? 'นาย'],
      th_first_name: [user?.th_first_name ?? ''],
      th_last_name:  [user?.th_last_name ?? ''],
      en_first_name: [user?.en_first_name ?? ''],
      en_last_name:  [user?.en_last_name ?? ''],
      email:         [user?.email ?? ''],
      team_id:       [user?.team_id ?? ''],
      sub_team_id:   [user?.sub_team_id ?? ''],
      phone:         [user?.phone ?? ''],
    });
  }

  openCreate() { this.selectedUser = null; this.initForm(); this.showModal = true; }
  openEdit(u: User) { this.selectedUser = u; this.initForm(u); this.showModal = true; }
  openDetail(u: User) { this.selectedUser = u; this.showDetailModal = true; }

  save() {
    this.saving = true;
    const fd = new FormData();
    Object.entries(this.form.value).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v as string); });
    const obs = this.selectedUser
      ? this.usersSvc.update(this.selectedUser.user_id, fd)
      : this.usersSvc.create(fd);

    obs.subscribe({
      next: () => {
        this.toast.success(this.selectedUser ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มนักกีฬาสำเร็จ');
        this.showModal = false;
        this.saving = false;
        this.loadUsers();
      },
      error: () => { this.saving = false; }
    });
  }

  deactivate(u: User) {
    this.usersSvc.deactivate(u.user_id).subscribe(() => {
      this.toast.warning(`ระงับบัญชี ${u.th_first_name} แล้ว`);
      this.loadUsers();
      this.showDetailModal = false;
    });
  }

  /** Super Admin เห็นทุก, Coach เห็นลูกทีมตัวเอง, Player เห็นตัวเอง */
  canSeePhone(u: User): boolean {
    const me = this.auth.currentUser;
    if (!me) return false;
    if (me.role === 'Super Admin') return true;
    if (me.role === 'Coach') return !!me.team_id && me.team_id === u.team_id;
    if (me.role === 'Player') return me.user_id === u.user_id;
    return false;
  }

  /** เฉพาะ Super Admin */
  get canSeeBirthDate(): boolean { return this.auth.currentUser?.role === 'Super Admin'; }

  /** เฉพาะ Super Admin จัดการได้ */
  get canManage(): boolean { return this.auth.currentUser?.role === 'Super Admin'; }

  // ─── trackBy helpers (prevent full DOM re-render on any change) ───
  trackByUserId(_: number, u: User): string { return u.user_id; }
  trackByTeamId(_: number, t: Team): string { return t.team_id; }
}
