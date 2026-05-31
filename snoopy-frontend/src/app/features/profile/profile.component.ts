import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { TeamsService } from '../../core/services/teams.service';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { User } from '../../models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  teamName = '';
  subTeamName = '';

  constructor(
    public auth: AuthService,
    private teamsSvc: TeamsService,
    public langSvc: LanguageService,
    public theme: ThemeService,
  ) {}

  ngOnInit() {
    this.user = this.auth.currentUser as User;
    if (this.user?.team_name) this.teamName = this.user.team_name;
    this.teamsSvc.getAll().subscribe((r: any) => {
      if (!r.success) return;
      const teams = r.data as any[];
      const t = teams.find(x => x.team_id === this.user?.team_id);
      if (t) this.teamName = t.team_name;
      const st = teams.find(x => x.team_id === this.user?.sub_team_id);
      if (st) this.subTeamName = st.team_name;
    });
  }

  get fullThName(): string {
    if (!this.user) return '';
    return `${this.user.th_prefix ?? ''}${this.user.th_first_name} ${this.user.th_last_name}`.trim();
  }
  get fullEnName(): string {
    if (!this.user) return '';
    return `${this.user.en_first_name} ${this.user.en_last_name}`.trim();
  }
  get initials(): string {
    if (!this.user) return '';
    return `${this.user.en_first_name?.charAt(0) ?? ''}${this.user.en_last_name?.charAt(0) ?? ''}`.toUpperCase();
  }
  logout() { this.auth.logout(); }
}
