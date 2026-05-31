import { Directive, OnInit, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { LanguageService } from '../services/language.service';
import { ConfirmService } from '../services/confirm.service';
import { ApiResponse } from '../../models';

/** Toast / confirm copy for one CRUD screen (Thai source strings → translated). */
export interface CrudLabels {
  createOk: string;
  updateOk: string;
  deleteOk: string;
  deleteTitle: string;
  deleteConfirm: string;
  error: string;
}

/**
 * Base controller for "list + create/edit modal + delete" feature screens.
 *
 * It owns the duplicated scaffolding (loading / showModal / editing / form /
 * saving and the load → openCreate/openEdit → save → delete flow). Subclasses
 * fill in the parts that actually differ via template-method hooks:
 *
 *   required: entityId, buildForm, fetch, createReq, updateReq, deleteReq, labels
 *   optional: mapList (filter/transform list), toPayload (form → request body),
 *             afterSave (side-effects e.g. navigate), deleteMessage (confirm text)
 *
 * @Directive() (no selector) is Angular's supported way to give an abstract
 * base class dependency-injection + lifecycle support.
 */
@Directive()
export abstract class CrudModalController<T> implements OnInit {
  items: T[] = [];
  loading = true;
  saving = false;
  showModal = false;
  editing: T | null = null;
  form!: FormGroup;

  protected toast   = inject(ToastService);
  protected lang    = inject(LanguageService);
  protected confirm = inject(ConfirmService);

  // ── Required hooks ──────────────────────────────────────
  protected abstract entityId(e: T): string;
  protected abstract buildForm(e?: T): FormGroup;
  protected abstract fetch(): Observable<ApiResponse<T[]>>;
  protected abstract createReq(payload: unknown): Observable<unknown>;
  protected abstract updateReq(id: string, payload: unknown): Observable<unknown>;
  protected abstract deleteReq(id: string): Observable<unknown>;
  protected abstract labels: CrudLabels;

  // ── Optional hooks (sensible defaults) ──────────────────
  protected mapList(data: T[]): T[] { return data; }
  protected toPayload(formValue: any): unknown { return formValue; }
  protected afterSave(_res: unknown, _isCreate: boolean): void { /* override for side-effects */ }
  protected deleteMessage(_e: T): string { return ''; }

  ngOnInit(): void {
    this.form = this.buildForm();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.fetch().subscribe({
      next: (r) => { this.items = r.success ? this.mapList(r.data) : []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreate(): void { this.editing = null; this.form = this.buildForm(); this.showModal = true; }
  openEdit(e: T): void { this.editing = e; this.form = this.buildForm(e); this.showModal = true; }
  closeModal(): void { this.showModal = false; }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const isCreate = !this.editing;
    const payload  = this.toPayload(this.form.getRawValue());
    const req = isCreate
      ? this.createReq(payload)
      : this.updateReq(this.entityId(this.editing as T), payload);

    req.subscribe({
      next: (res) => {
        this.toast.success(this.lang.translate(isCreate ? this.labels.createOk : this.labels.updateOk));
        this.showModal = false;
        this.saving = false;
        this.load();
        this.afterSave(res, isCreate);
      },
      error: (e: any) => {
        this.saving = false;
        this.toast.error(e?.error?.error?.message ?? this.lang.translate(this.labels.error));
      },
    });
  }

  remove(e: T): void {
    this.confirm.confirm({
      title: this.lang.translate(this.labels.deleteTitle),
      message: this.deleteMessage(e),
      confirmLabel: this.lang.translate(this.labels.deleteConfirm),
      danger: true,
    }).subscribe(ok => {
      if (!ok) return;
      this.deleteReq(this.entityId(e)).subscribe(() => {
        this.toast.warning(this.lang.translate(this.labels.deleteOk));
        this.load();
      });
    });
  }
}
