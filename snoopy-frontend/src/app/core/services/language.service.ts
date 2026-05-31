import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EN } from '../i18n/dictionary';

export type Lang = 'th' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly KEY = 'snoopy_lang';
  private _lang = new BehaviorSubject<Lang>(this.load());
  lang$ = this._lang.asObservable();

  get lang(): Lang { return this._lang.value; }

  toggle(): void { this.set(this._lang.value === 'th' ? 'en' : 'th'); }

  set(lang: Lang): void {
    localStorage.setItem(this.KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    this._lang.next(lang);
  }

  /** Translate a Thai source string. TH returns it as-is; EN looks up the dictionary. */
  translate(thai: string): string {
    if (this._lang.value === 'th') return thai;
    return EN[thai] ?? thai;
  }

  private load(): Lang {
    const saved = localStorage.getItem(this.KEY) as Lang | null;
    return saved === 'en' ? 'en' : 'th';
  }
}
