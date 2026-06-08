import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthUser, User, ApiResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'snoopy_token';
  private readonly USER_KEY  = 'snoopy_user';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.loadUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return !!this.token && !!this.currentUser;
  }

  get role(): string {
    return this.currentUser?.role ?? '';
  }

  get teamId(): string | undefined {
    return this.currentUser?.team_id;
  }

  get isAdmin(): boolean  { return this.role === 'Super Admin'; }
  get isCoach(): boolean  { return this.role === 'Coach'; }
  get isPlayer(): boolean { return this.role === 'Player'; }

  loginWithGoogle(code: string): Observable<ApiResponse<AuthUser>> {
    return this.http.post<ApiResponse<AuthUser>>(
      `${environment.apiBaseUrl}/auth/google`, { code }
    ).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  /** Fetch the caller's full profile, incl. restricted fields (phone, birth_date). */
  getMe(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${environment.apiBaseUrl}/auth/me`);
  }

  logout(): void {
    this.http.post(`${environment.apiBaseUrl}/auth/logout`, {}).subscribe();
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private setSession(user: AuthUser): void {
    localStorage.setItem(this.TOKEN_KEY, user.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  private loadUser(): AuthUser | null {
    try {
      const json = localStorage.getItem(this.USER_KEY);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }
}
