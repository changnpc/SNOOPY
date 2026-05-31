import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LeaveService } from '../../core/services/leave.service';
import { UsersService } from '../../core/services/users.service';
import { TeamsService } from '../../core/services/teams.service';
import { ToastService } from '../../core/services/toast.service';
import { LanguageService } from '../../core/services/language.service';
import { LeaveRequest, User, Team } from '../../models';

@Component({ selector: 'app-leave', templateUrl: './leave.component.html' })
export class LeaveComponent implements OnInit {
  activeTab = '';
  myLeaves: LeaveRequest[] = [];
  pendingLeaves: LeaveRequest[] = [];
  allLeaves: LeaveRequest[] = [];
  allUsers: User[] = [];
  allTeams: Team[] = [];
  loading = false;

  showSubmitModal = false;
  showRejectModal = false;
  rejectId = '';
  rejectForm!: FormGroup;
  submitForm!: FormGroup;
  saving = false;
  today = new Date().toISOString().slice(0,10);
  selectedEvidence: File | null = null;
  evidencePreview: string | null = null;

  constructor(
    public auth: AuthService,
    private leaveSvc: LeaveService,
    private usersSvc: UsersService,
    private teamsSvc: TeamsService,
    private toast: ToastService,
    private fb: FormBuilder,
    private langSvc: LanguageService
  ) {}

  ngOnInit() {
    this.activeTab = this.auth.isPlayer ? 'my' : 'pending';
    this.initForms();
    this.teamsSvc.getAll().subscribe((r: any) => { if (r.success) this.allTeams = r.data; });
    this.usersSvc.getAll().subscribe((r: any) => { if (r.success) this.allUsers = r.data; });
    this.loadAll();
  }

  initForms() {
    this.submitForm = this.fb.group({
      start_date: [this.today, Validators.required],
      end_date:   [this.today, Validators.required],
      reason:     ['', [Validators.required, Validators.minLength(2)]],
    });
    this.rejectForm = this.fb.group({
      reject_reason: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  loadAll() {
    this.loading = true;
    this.leaveSvc.getMy().subscribe((res: any) => {
      this.myLeaves = res.success ? res.data : [];
    });
    if (this.auth.role !== 'Player') {
      const teamFilter = this.auth.isCoach && this.auth.currentUser?.team_id
        ? { team_id: this.auth.currentUser.team_id }
        : {};
      this.leaveSvc.getAll({ status: 'Pending', ...teamFilter }).subscribe((res: any) => {
        this.pendingLeaves = res.success ? res.data : [];
      });
      this.leaveSvc.getAll({ ...teamFilter }).subscribe((res: any) => {
        this.allLeaves = res.success ? res.data : [];
        this.loading = false;
      });
    } else { this.loading = false; }
  }

  onEvidence(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedEvidence = file;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => this.evidencePreview = e.target?.result as string;
      reader.readAsDataURL(file);
    } else {
      this.evidencePreview = null;
    }
  }

  openSubmitModal() {
    this.selectedEvidence = null;
    this.evidencePreview = null;
    this.initForms();
    this.showSubmitModal = true;
  }

  submitLeave() {
    if (this.submitForm.invalid) return;
    this.saving = true;
    const fd = new FormData();
    Object.entries(this.submitForm.value).forEach(([k,v]) => fd.append(k, v as string));
    if (this.selectedEvidence) fd.append('evidence', this.selectedEvidence);
    this.leaveSvc.submit(fd).subscribe({
      next: () => { this.toast.success('ส่งคำขอลาสำเร็จ'); this.showSubmitModal = false; this.saving = false; this.loadAll(); },
      error: (e) => { this.saving = false; this.toast.error(e.error?.error?.message ?? 'เกิดข้อผิดพลาด'); }
    });
  }

  cancel(id: string) {
    if (!confirm('ยืนยันยกเลิกคำขอลา?')) return;
    this.leaveSvc.cancel(id).subscribe({ next: () => { this.toast.info('ยกเลิกคำขอลาแล้ว'); this.loadAll(); } });
  }

  approve(id: string) {
    this.leaveSvc.approve(id).subscribe({ next: () => { this.toast.success('อนุมัติคำขอลาแล้ว'); this.loadAll(); } });
  }

  openReject(id: string) { this.rejectId = id; this.rejectForm.reset(); this.showRejectModal = true; }

  confirmReject() {
    if (this.rejectForm.invalid) return;
    this.leaveSvc.reject(this.rejectId, this.rejectForm.value.reject_reason).subscribe({
      next: () => { this.toast.warning('ปฏิเสธคำขอลาแล้ว'); this.showRejectModal = false; this.loadAll(); },
      error: (e) => { this.toast.error(e.error?.error?.message ?? 'เกิดข้อผิดพลาด'); }
    });
  }

  getPlayerName(id: string) {
    const u = this.allUsers.find(u => u.user_id === id);
    return u ? `${u.th_prefix}${u.th_first_name} ${u.th_last_name}` : id;
  }

  statusLabel(s: string) { return this.langSvc.translate(({ Pending:'รอดำเนินการ', Approved:'อนุมัติแล้ว', Rejected:'ปฏิเสธ', Cancelled:'ยกเลิก' } as Record<string,string>)[s] ?? s); }
  statusClass(s: string) { return { Pending:'badge-warning', Approved:'badge-success', Rejected:'badge-danger', Cancelled:'badge-gray' }[s] ?? 'badge-gray'; }

  // ─── trackBy helpers ──────────────────────────────────────
  trackByLeaveId(_: number, lv: LeaveRequest): string { return lv.leave_id; }
}
