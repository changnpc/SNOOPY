import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface RolePermission {
  role: string; resource: string;
  can_view: string; can_create: string; can_edit: string; can_delete: string;
}

export interface PermMatrix {
  [role: string]: { [resource: string]: { view: boolean; create: boolean; edit: boolean; delete: boolean } };
}

@Injectable({ providedIn: 'root' })
export class RolePermissionsService {
  private _matrix$ = new BehaviorSubject<PermMatrix>({});
  matrix$ = this._matrix$.asObservable();

  constructor(private api: ApiService, private auth: AuthService) {
    this.load();
  }

  load() {
    this.api.get<any>('/role-permissions').subscribe(res => {
      if (res.success) this._buildMatrix(res.data);
    });
  }

  private _buildMatrix(rows: RolePermission[]) {
    const m: PermMatrix = {};
    for (const r of rows) {
      if (!m[r.role]) m[r.role] = {};
      m[r.role][r.resource] = {
        view:   this._b(r.can_view),
        create: this._b(r.can_create),
        edit:   this._b(r.can_edit),
        delete: this._b(r.can_delete),
      };
    }
    this._matrix$.next(m);
  }

  private _b(v: string): boolean { return String(v).toUpperCase() === 'TRUE'; }

  /** Check permission — Super Admin always true */
  can(resource: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean {
    const role = this.auth.currentUser?.role;
    if (!role || role === 'Super Admin') return true;
    const m = this._matrix$.value;
    return m[role]?.[resource]?.[action] ?? false;
  }

  getAll() { return this.api.get<any>('/role-permissions'); }
  save(data: any[]) { return this.api.post<any>('/role-permissions', data); }
}
