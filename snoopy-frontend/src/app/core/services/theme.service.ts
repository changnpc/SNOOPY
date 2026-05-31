import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'snoopy_theme';
  private _theme = new BehaviorSubject<ThemeMode>(this.load());
  theme$ = this._theme.asObservable();

  constructor() { this.apply(this._theme.value); }

  get theme(): ThemeMode { return this._theme.value; }

  toggle(): void {
    this.set(this._theme.value === 'dark' ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    localStorage.setItem(this.KEY, mode);
    this._theme.next(mode);
    this.apply(mode);
  }

  private apply(mode: ThemeMode): void {
    const root = document.documentElement;
    if (mode === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#0c1322' : '#1b3a8f');
  }

  private load(): ThemeMode {
    const saved = localStorage.getItem(this.KEY) as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') return saved;
    // Fall back to OS preference
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
