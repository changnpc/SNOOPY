import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/services/language.service';

/**
 * Usage: {{ 'ภาษาไทยต้นฉบับ' | t }}
 * Returns the Thai source when lang=th, or its English translation when lang=en.
 * impure pipe → re-evaluates when the language changes.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform, OnDestroy {
  private sub: Subscription;
  private lastIn = '';
  private lastOut = '';

  constructor(private lang: LanguageService, private cdr: ChangeDetectorRef) {
    this.sub = this.lang.lang$.subscribe(() => {
      this.lastIn = '\0'; // invalidate cache
      this.cdr.markForCheck();
    });
  }

  transform(value: string): string {
    if (value == null) return value;
    if (value === this.lastIn) return this.lastOut;
    this.lastIn = value;
    this.lastOut = this.lang.translate(value);
    return this.lastOut;
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
