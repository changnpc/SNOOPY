import { Pipe, PipeTransform } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

const REALBRIDGE_HOST = 'https://play.realbridge.online';

@Pipe({ name: 'rbLink', pure: false })
export class RealbridgeLinkPipe implements PipeTransform {
  // Memoize last result so change detection doesn't recompute every cycle
  // when neither the URL nor the logged-in user has changed.
  private lastUrl: string | undefined | null = undefined;
  private lastUserId: string | undefined = undefined;
  private lastOut = '';

  constructor(private auth: AuthService) {}

  transform(url: string | undefined | null): string {
    const userId = this.auth.currentUser?.user_id;
    if (url === this.lastUrl && userId === this.lastUserId) return this.lastOut;

    this.lastUrl    = url;
    this.lastUserId = userId;
    this.lastOut    = this.compute(url);
    return this.lastOut;
  }

  private compute(url: string | undefined | null): string {
    if (!url) return '';
    if (!url.startsWith(REALBRIDGE_HOST)) return url;

    const user = this.auth.currentUser;
    if (!user) return url;

    // avoid double-appending if already has &n=
    if (url.includes('&n=') || url.includes('?n=')) return url;

    const first = user.en_first_name.charAt(0).toUpperCase() + user.en_first_name.slice(1).toLowerCase();
    const last  = user.en_last_name.toUpperCase();
    const name  = encodeURIComponent(`${first} ${last}`);
    const sep   = url.includes('?') ? '&' : '?';
    const id     = encodeURIComponent(user.user_id);
    return `${url}${sep}n=${name}&i=${id}`;
  }
}
