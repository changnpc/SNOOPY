import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/services/language.service';
import { TeamsService } from '../../core/services/teams.service';
import { User } from '../../models';
import { mascotAvatarUri } from '../mascot-svg';

/**
 * Shared, single-source-of-truth display pipes.
 *
 * These replace the copy-pasted view helpers that used to live in every
 * feature component (getAvatar ×5, formatDate ×6, roleBadgeClass ×2,
 * getTeamName ×6). Centralising them means a change (e.g. the avatar colour)
 * happens in exactly one place.
 */

/**
 * {{ user | avatar }} → avatar image URL.
 * Real uploaded photo wins; otherwise a varied "Buddy" mascot (seeded by the
 * user id/name) so every athlete gets a consistent, distinct cartoon avatar.
 */
@Pipe({ name: 'avatar', pure: true })
export class AvatarPipe implements PipeTransform {
  transform(user: User | null | undefined, _size = 80): string {
    if (user?.img_avatar_url) return user.img_avatar_url;
    const seed = user?.user_id || `${user?.en_first_name ?? ''}${user?.en_last_name ?? ''}` || 'buddy';
    return mascotAvatarUri(seed);
  }
}

/** {{ role | roleBadge }} → badge CSS class for a user role. */
@Pipe({ name: 'roleBadge', pure: true })
export class RoleBadgePipe implements PipeTransform {
  transform(role: string | null | undefined): string {
    switch (role) {
      case 'Super Admin': return 'badge-danger';
      case 'Coach':       return 'badge-primary';
      case 'Player':      return 'badge-success';
      default:            return 'badge-gray';
    }
  }
}

type DateMode = 'short' | 'long' | 'full' | 'datetime';

/**
 * {{ date | locDate }}            → 31 May 2026 (short, default)
 * {{ date | locDate:'long' }}     → 31 May 2026 (full month)
 * {{ date | locDate:'full' }}     → Sunday, 31 May 2026
 * {{ date | locDate:'datetime' }} → 31 May 2026, 14:30
 *
 * Locale follows the active language. impure → re-renders on language switch.
 */
@Pipe({ name: 'locDate', pure: false })
export class LocalizedDatePipe implements PipeTransform, OnDestroy {
  private sub: Subscription;
  private lastKey = '';
  private lastOut = '';

  constructor(private lang: LanguageService, private cdr: ChangeDetectorRef) {
    this.sub = this.lang.lang$.subscribe(() => {
      this.lastKey = '\0';        // invalidate memo
      this.cdr.markForCheck();
    });
  }

  transform(d: string | null | undefined, mode: DateMode = 'short'): string {
    const key = `${mode}|${d ?? ''}`;
    if (key === this.lastKey) return this.lastOut;
    this.lastKey = key;
    this.lastOut = this.format(d, mode);
    return this.lastOut;
  }

  private format(d: string | null | undefined, mode: DateMode): string {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    const locale = this.lang.lang === 'en' ? 'en-GB' : 'th-TH';

    if (mode === 'datetime') {
      return dt.toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', day: 'numeric', month: mode === 'short' ? 'short' : 'long' };
    if (mode === 'full') opts.weekday = 'long';
    return dt.toLocaleDateString(locale, opts);
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}

/**
 * {{ teamId | teamName }} → team name, resolved from the shared TeamsService
 * cache. Falls back to the id if not found, '' when id is empty.
 * impure → resolves once the (cached) team list has loaded.
 */
@Pipe({ name: 'teamName', pure: false })
export class TeamNamePipe implements PipeTransform {
  constructor(private teams: TeamsService) {}
  transform(id: string | null | undefined): string {
    this.teams.ensureNames();
    return this.teams.nameOf(id);
  }
}
