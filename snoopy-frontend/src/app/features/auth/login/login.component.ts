import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  error = '';
  loading = false;

  // Branding (shown under login card)
  readonly appVersion    = environment.version;
  readonly author        = environment.author;
  readonly copyrightYear = environment.copyrightYear;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn) {
      this.router.navigate(['/dashboard']);
      return;
    }
    // Handle OAuth callback — code param in URL
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      this.handleCallback(code);
    }
  }

  loginWithGoogle(): void {
    const params = new URLSearchParams({
      client_id:     environment.googleClientId,
      redirect_uri:  `${window.location.origin}/login`,
      response_type: 'code',
      scope:         'openid email profile',
      access_type:   'offline',
      prompt:        'select_account',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  private handleCallback(code: string): void {
    this.loading = true;
    this.error = '';
    window.history.replaceState({}, '', '/login');

    this.auth.loginWithGoogle(code).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        const errCode = err.error?.error?.code;
        if (['AUTH_ACCOUNT_NOT_FOUND', 'AUTH_ACCOUNT_INACTIVE'].includes(errCode)) {
          this.error = 'บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งานระบบ';
        } else {
          this.error = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
        }
      },
    });
  }
}
