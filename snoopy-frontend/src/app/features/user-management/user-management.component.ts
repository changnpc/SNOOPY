import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';
import { TeamsService } from '../../core/services/teams.service';
import { ToastService } from '../../core/services/toast.service';
import { RolePermissionsService, RolePermission } from '../../core/services/role-permissions.service';
import { LanguageService } from '../../core/services/language.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { User, Team } from '../../models';
import { SelectOption } from '../../shared/components/ui-select/ui-select.component';

interface PermRow { resource: string; label: string; coach_view: boolean; coach_create: boolean; coach_edit: boolean; coach_delete: boolean; player_view: boolean; player_create: boolean; player_edit: boolean; player_delete: boolean; }

const RESOURCES = [
  { key: 'athletes',      label: 'โปรไฟล์นักกีฬา',  icon: 'groups' },
  { key: 'attendance',    label: 'เช็กชื่อ',          icon: 'how_to_reg' },
  { key: 'leave',         label: 'การลา',             icon: 'event_busy' },
  { key: 'calendar',      label: 'ปฏิทิน',            icon: 'calendar_month' },
  { key: 'activities',    label: 'กิจกรรม',           icon: 'campaign' },
  { key: 'practice',      label: 'ลิงก์ซ้อม',         icon: 'link' },
  { key: 'notifications', label: 'การแจ้งเตือน',      icon: 'notifications' },
  { key: 'teams',         label: 'จัดการทีม',         icon: 'shield_person' },
];

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
})
export class UserManagementComponent implements OnInit {
  tab: 'users' | 'permissions' = 'users';

  // ── Users tab ──
  loading = true;
  users: User[] = [];
  filtered: User[] = [];
  teams: Team[] = [];
  allSubTeams: Team[] = [];
  search = '';
  roleFilter = '';
  teamFilter = '';

  showModal = false;
  showDetailModal = false;
  editingUser: User | null = null;
  form!: FormGroup;
  saving = false;

  selectedUser: User | null = null;

  // ── Permissions tab ──
  permRows: PermRow[] = [];
  permLoading = true;
  permSaving = false;

  readonly ROLE_OPTIONS: SelectOption[] = [
    { value: 'Player',      label: 'Player' },
    { value: 'Coach',       label: 'Coach' },
    { value: 'Super Admin', label: 'Super Admin' },
  ];

  constructor(
    public auth: AuthService,
    private usersSvc: UsersService,
    private teamsSvc: TeamsService,
    private toast: ToastService,
    private fb: FormBuilder,
    private permSvc: RolePermissionsService,
    public langSvc: LanguageService,
    private confirm: ConfirmService,
  ) {}

  ngOnInit() {
    this.teamsSvc.getAllIncludingSub().subscribe((res: any) => {
      if (res.success) {
        this.allSubTeams = res.data.filter((t: any) => !!t.parent_team_id);
        this.teams       = res.data.filter((t: any) => !t.parent_team_id);
      }
    });
    this.loadUsers();
    this.loadPermissions();
    this.initForm();
  }

  // ─── Users ─────────────────────────────────────────────
  loadUsers() {
    this.loading = true;
    this.usersSvc.getAll().subscribe({
      next: (res: any) => {
        this.users = res.success ? res.data : [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() {
    let r = [...this.users];
    if (this.search) {
      const q = this.search.toLowerCase();
      r = r.filter(u =>
        u.th_first_name.toLowerCase().includes(q) ||
        u.th_last_name.toLowerCase().includes(q) ||
        u.en_first_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    if (this.roleFilter) r = r.filter(u => u.role === this.roleFilter);
    if (this.teamFilter) r = r.filter(u => u.team_id === this.teamFilter);
    this.filtered = r;
  }

  initForm(user?: User) {
    this.form = this.fb.group({
      th_prefix:     [user?.th_prefix ?? 'นาย'],
      th_first_name: [user?.th_first_name ?? '', Validators.required],
      th_last_name:  [user?.th_last_name ?? '',  Validators.required],
      en_first_name: [user?.en_first_name ?? ''],
      en_last_name:  [user?.en_last_name ?? ''],
      email:         [user?.email ?? '', [Validators.required, Validators.email]],
      role:          [user?.role ?? 'Player', Validators.required],
      team_id:       [user?.team_id ?? ''],
      sub_team_id:   [user?.sub_team_id ?? ''],
      phone:         [user?.phone ?? ''],
    });
  }

  openCreate() { this.editingUser = null; this.initForm(); this.showModal = true; }
  openEdit(u: User) { this.editingUser = u; this.initForm(u); this.showModal = true; }
  openDetail(u: User) { this.selectedUser = u; this.showDetailModal = true; }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const fd = new FormData();
    Object.entries(this.form.value).forEach(([k, v]) => { if (v != null) fd.append(k, v as string); });
    const obs = this.editingUser
      ? this.usersSvc.update(this.editingUser.user_id, fd)
      : this.usersSvc.create(fd);
    obs.subscribe({
      next: () => {
        this.toast.success(this.editingUser ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มผู้ใช้สำเร็จ');
        this.showModal = false;
        this.saving = false;
        this.loadUsers();
      },
      error: () => { this.saving = false; }
    });
  }

  deactivate(u: User) {
    this.confirm.confirm({
      title: this.langSvc.translate('ระงับบัญชี'),
      message: `${u.th_prefix ?? ''}${u.th_first_name} ${u.th_last_name}`,
      confirmLabel: this.langSvc.translate('ระงับบัญชี'),
      danger: true,
    }).subscribe(ok => {
      if (!ok) return;
      this.usersSvc.deactivate(u.user_id).subscribe(() => {
        this.toast.warning(`${this.langSvc.translate('ระงับบัญชี')} ${u.th_first_name}`);
        this.showDetailModal = false;
        this.loadUsers();
      });
    });
  }

  reactivate(u: User) {
    this.usersSvc.reactivate(u.user_id).subscribe(() => {
      this.toast.success(`เปิดใช้งานบัญชี ${u.th_first_name} แล้ว`);
      this.showDetailModal = false;
      this.loadUsers();
    });
  }

  getSubTeamsOf(parentId: string) {
    return this.allSubTeams.filter(s => s.parent_team_id === parentId);
  }

  get teamSelectOptions(): SelectOption[] {
    return [{ value: '', label: '— ไม่ระบุทีม —' }, ...this.teams.map(t => ({ value: t.team_id, label: t.team_name }))];
  }

  get subTeamSelectOptions(): SelectOption[] {
    const tid = this.form?.get('team_id')?.value;
    if (!tid) return [];
    return [{ value: '', label: '— ไม่ระบุทีมย่อย —' }, ...this.getSubTeamsOf(tid).map(s => ({ value: s.team_id, label: s.team_name }))];
  }

  get teamFilterOptions(): SelectOption[] {
    return [{ value: '', label: 'ทุกทีม' }, ...this.teams.map(t => ({ value: t.team_id, label: t.team_name }))];
  }


  get countAll():    number { return this.users.length; }
  get countAdmin():  number { return this.users.filter(u => u.role === 'Super Admin').length; }
  get countCoach():  number { return this.users.filter(u => u.role === 'Coach').length; }
  get countPlayer(): number { return this.users.filter(u => u.role === 'Player').length; }

  // ─── Permissions ────────────────────────────────────────
  loadPermissions() {
    this.permLoading = true;
    this.permSvc.getAll().subscribe({
      next: (res: any) => {
        if (res.success) this._buildPermRows(res.data);
        this.permLoading = false;
      },
      error: () => { this.permLoading = false; }
    });
  }

  private _buildPermRows(rows: RolePermission[]) {
    this.permRows = RESOURCES.map(res => {
      const c = rows.find(r => r.role === 'Coach'  && r.resource === res.key);
      const p = rows.find(r => r.role === 'Player' && r.resource === res.key);
      const b = (v?: string) => String(v).toUpperCase() === 'TRUE';
      return {
        resource:       res.key,
        label:          res.label,
        coach_view:     b(c?.can_view),
        coach_create:   b(c?.can_create),
        coach_edit:     b(c?.can_edit),
        coach_delete:   b(c?.can_delete),
        player_view:    b(p?.can_view),
        player_create:  b(p?.can_create),
        player_edit:    b(p?.can_edit),
        player_delete:  b(p?.can_delete),
      };
    });
  }

  resourceIcon(res: string): string {
    return RESOURCES.find(r => r.key === res)?.icon ?? 'circle';
  }

  savePermissions() {
    this.permSaving = true;
    const payload = this.permRows.flatMap(r => [
      { role: 'Coach',  resource: r.resource, can_view: r.coach_view,  can_create: r.coach_create,  can_edit: r.coach_edit,  can_delete: r.coach_delete  },
      { role: 'Player', resource: r.resource, can_view: r.player_view, can_create: r.player_create, can_edit: r.player_edit, can_delete: r.player_delete },
    ]);
    this.permSvc.save(payload).subscribe({
      next: () => { this.toast.success('บันทึก Permission สำเร็จ'); this.permSaving = false; this.permSvc.load(); },
      error: () => { this.permSaving = false; }
    });
  }

  // ─── trackBy helpers ──────────────────────────────────────
  trackByUserId(_: number, u: User): string { return u.user_id; }
  trackByResource(_: number, r: PermRow): string { return r.resource; }
}
