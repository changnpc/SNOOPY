import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ActivitiesService } from '../../core/services/activities.service';
import { CrudModalController, CrudLabels } from '../../core/base/crud-modal.controller';
import { Activity, ApiResponse } from '../../models';

@Component({ selector: 'app-activity', templateUrl: './activity.component.html' })
export class ActivityComponent extends CrudModalController<Activity> {
  selectedAttachment: File | null = null;

  /** Template alias for the inherited generic list. */
  get activities(): Activity[] { return this.items; }

  /** True if URL is a Google Maps link → show a "Maps" button instead. */
  isMapLink(url?: string): boolean {
    return !!url && /maps\.app\.goo\.gl|google\.[a-z.]+\/maps|goo\.gl\/maps/i.test(url);
  }

  constructor(
    public auth: AuthService,
    private svc: ActivitiesService,
    private fb: FormBuilder,
    private router: Router,
  ) { super(); }

  // ── CRUD hooks ──────────────────────────────────────────
  protected entityId(a: Activity): string { return a.activity_id; }
  protected fetch(): Observable<ApiResponse<Activity[]>> { return this.svc.getAll() as any; }
  protected createReq(p: unknown) { return this.svc.create(p as FormData); }
  protected updateReq(id: string, p: unknown) { return this.svc.update(id, p as FormData); }
  protected deleteReq(id: string) { return this.svc.delete(id); }
  protected override mapList(data: Activity[]): Activity[] { return data.filter(a => a.title !== '[DELETED]'); }
  protected override deleteMessage(a: Activity): string { return `"${a.title}"`; }

  protected labels: CrudLabels = {
    createOk: 'บันทึกกิจกรรมสำเร็จ', updateOk: 'บันทึกกิจกรรมสำเร็จ',
    deleteOk: 'ลบกิจกรรมแล้ว', deleteTitle: 'ลบกิจกรรม', deleteConfirm: 'ลบ',
    error: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
  };

  protected buildForm(a?: Activity): FormGroup {
    return this.fb.group({
      title:     [a?.title ?? '', Validators.required],
      date_from: [a?.date_from ?? '', Validators.required],
      date_to:   [a?.date_to ?? '', Validators.required],
      location:  [a?.location ?? ''],
      details:   [a?.details ?? '', Validators.required],
      url:       [a?.url ?? ''],
    }, { validators: dateRangeValidator });
  }

  /** True when form has the dateRange error (end before start). */
  get dateRangeError(): boolean {
    return this.form?.errors?.['dateRange'] && this.form.get('date_to')?.dirty;
  }

  protected override toPayload(v: any): FormData {
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.append(k, val as string));
    if (this.selectedAttachment) fd.append('attachment', this.selectedAttachment);
    return fd;
  }

  /** After creating an activity, jump to the calendar with a prefilled event. */
  protected override afterSave(res: any, isCreate: boolean): void {
    if (!isCreate) return;
    const v = this.form.value;
    this.router.navigate(['/calendar'], {
      state: {
        prefillEvent: {
          title: v.title, start_date: v.date_from, end_date: v.date_to,
          is_all_day: true, color: '#0288d1',
          description: v.location ? `📍 ${v.location}` : '',
          ref_id: res?.data?.activity_id ?? '',
        },
      },
    });
  }

  // ── Template-facing extras ──────────────────────────────
  override openCreate(): void { this.selectedAttachment = null; super.openCreate(); }
  override openEdit(a: Activity): void { this.selectedAttachment = null; super.openEdit(a); }
  delete(a: Activity): void { this.remove(a); }
  onAttachment(e: Event) { this.selectedAttachment = (e.target as HTMLInputElement).files?.[0] ?? null; }

  private readonly COLORS = ['indigo','teal','amber','rose','violet','sky'];
  colorClass(i: number): string { return this.COLORS[i % this.COLORS.length]; }
  cardIcon(a: Activity): string {
    if (a.url) return 'public';
    if (a.attachment_url) return 'description';
    return 'campaign';
  }
  trackByActivityId(_: number, a: Activity): string { return a.activity_id; }
}

/** Cross-field validator: date_to must be ≥ date_from. */
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('date_from')?.value as string;
  const to   = group.get('date_to')?.value as string;
  if (from && to && to < from) return { dateRange: true };
  return null;
}
