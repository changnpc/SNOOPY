import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { LeaveService } from '../../core/services/leave.service';
import { EventsService } from '../../core/services/events.service';
import { ActivitiesService } from '../../core/services/activities.service';
import { TeamsService } from '../../core/services/teams.service';
import { LanguageService } from '../../core/services/language.service';
import { CompetitionsService } from '../../core/services/competitions.service';
import { CoachPlayerStats, PlayerDashboardStats } from '../../models';
import { mascotAvatarUri } from '../../shared/mascot-svg';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  loading = true;
  today = new Date().toISOString().slice(0, 10);

  // Admin / Coach
  stats = { players: 0, presentToday: 0, pendingLeave: 0, upcomingEvents: 0 };
  pendingLeaves: any[] = [];
  upcomingEvents: any[] = [];
  recentActivities: any[] = [];
  teamNames: Record<string, string> = {};
  userNames: Record<string, string> = {};

  // Attendance/competition summary stats
  coachTeamStats: CoachPlayerStats[] = [];
  coachTeamStatsLoading = true;
  myAttendanceStats: PlayerDashboardStats | null = null;

  // Search / filter for Admin+Coach team stats table
  statsSearch = '';
  statsFilterTeam = '';
  availableTeams: { team_id: string; team_name: string }[] = [];

  // Player
  playerStats = { myPendingLeave: 0, myTotalLeave: 0, upcomingEvents: 0, teamMates: 0 };
  myLeaves: any[] = [];
  myTeamName = '';

  constructor(
    public auth: AuthService,
    private usersSvc: UsersService,
    private attSvc: AttendanceService,
    private leaveSvc: LeaveService,
    private eventsSvc: EventsService,
    private activitiesSvc: ActivitiesService,
    private teamsSvc: TeamsService,
    private langSvc: LanguageService,
    private compSvc: CompetitionsService,
    private router: Router
  ) {}

  get isEn(): boolean { return this.langSvc.lang === 'en'; }

  ngOnInit() {
    if (this.auth.isPlayer) {
      this.loadPlayer();
      this.compSvc.getDashboardPlayer().subscribe({
        next: res => { if (res.success) this.myAttendanceStats = res.data; },
      });
    } else {
      this.loadAdminCoach();
      this.compSvc.getDashboardCoach().subscribe({
        next: res => { if (res.success) this.coachTeamStats = res.data; this.coachTeamStatsLoading = false; },
        error: () => { this.coachTeamStatsLoading = false; },
      });
    }
  }

  loadPlayer() {
    const teamId = this.auth.currentUser?.team_id ?? '';
    forkJoin({
      leaves:     this.leaveSvc.getMy(),
      events:     this.eventsSvc.getAll(),
      activities: this.activitiesSvc.getAll(),
      teammates:  this.usersSvc.getAll({ team_id: teamId }),
      teams:      this.teamsSvc.getAll(),
    }).subscribe({
      next: (res) => {
        const leaves = (res.leaves as any).success ? (res.leaves as any).data : [];
        this.myLeaves = leaves.slice(0, 4);
        this.playerStats.myPendingLeave = leaves.filter((l: any) => l.status === 'Pending').length;
        this.playerStats.myTotalLeave   = leaves.length;

        const events = ((res.events as any).success ? (res.events as any).data : []).filter((e: any) => e.title !== '[DELETED]');
        this.upcomingEvents = events.filter((e: any) => e.start_datetime >= this.today).slice(0, 4);
        this.playerStats.upcomingEvents = this.upcomingEvents.length;

        const teammates = (res.teammates as any).success ? (res.teammates as any).data : [];
        this.playerStats.teamMates = teammates.filter((u: any) => u.user_id !== this.auth.currentUser?.user_id).length;

        const teams = (res.teams as any).success ? (res.teams as any).data : [];
        this.myTeamName = teams.find((t: any) => t.team_id === teamId)?.team_name ?? '';

        this.recentActivities = (res.activities as any).success ? (res.activities as any).data.filter((a: any) => a.title !== '[DELETED]').slice(0, 3) : [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadAdminCoach() {
    const playerQuery: any = { role: 'Player', is_active: true };
    if (this.auth.isCoach && this.auth.teamId) playerQuery['team_id'] = this.auth.teamId;
    const leaveQuery: any = { status: 'Pending' };
    if (this.auth.isCoach && this.auth.teamId) leaveQuery['team_id'] = this.auth.teamId;
    forkJoin({
      users:      this.usersSvc.getAll(playerQuery),
      attendance: this.attSvc.getHistory({ date_from: this.today, date_to: this.today }),
      leaves:     this.leaveSvc.getAll(leaveQuery),
      events:     this.eventsSvc.getAll(),
      activities: this.activitiesSvc.getAll(),
      allUsers:   this.usersSvc.getAll(),
      teams:      this.teamsSvc.getAll(),
    }).subscribe({
      next: (res) => {
        // stats
        this.stats.players      = (res.users as any).success ? (res.users as any).data.length : 0;
        const att               = (res.attendance as any).success ? (res.attendance as any).data : [];
        this.stats.presentToday = att.filter((a: any) => a.status === 'Present').length;
        const leaves            = (res.leaves as any).success ? (res.leaves as any).data : [];
        this.stats.pendingLeave = leaves.length;
        this.pendingLeaves      = leaves.slice(0, 4);

        const events            = ((res.events as any).success ? (res.events as any).data : []).filter((e: any) => e.title !== '[DELETED]');
        const upcoming          = events.filter((e: any) => e.start_datetime >= this.today);
        this.stats.upcomingEvents = upcoming.length;
        this.upcomingEvents     = upcoming.slice(0, 4);

        this.recentActivities   = (res.activities as any).success ? (res.activities as any).data.filter((a: any) => a.title !== '[DELETED]').slice(0, 3) : [];

        // build lookup maps
        const allUsers: any[] = (res.allUsers as any).success ? (res.allUsers as any).data : [];
        allUsers.forEach((u: any) => {
          this.userNames[u.user_id] = `${u.th_prefix ?? ''}${u.th_first_name} ${u.th_last_name}`;
        });
        const teams: any[] = (res.teams as any).success ? (res.teams as any).data : [];
        teams.forEach((t: any) => { this.teamNames[t.team_id] = t.team_name; });
        this.availableTeams = teams.map((t: any) => ({ team_id: t.team_id, team_name: t.team_name }));

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get filteredStats(): CoachPlayerStats[] {
    const q = this.statsSearch.trim().toLowerCase();
    return this.coachTeamStats.filter(p => {
      const matchName = !q || p.th_name.toLowerCase().includes(q) || p.en_name.toLowerCase().includes(q);
      const matchTeam = !this.statsFilterTeam || p.team_id === this.statsFilterTeam;
      return matchName && matchTeam;
    });
  }

  getPlayerName(id: string) { return this.userNames[id] ?? id; }

  navigate(path: string) { this.router.navigate([path]); }

  resolveImgUrl(url?: string): string {
    const fallback = 'https://lh3.googleusercontent.com/d/1oQrpU75jqWRz05iZNdFqkl6WC6qfGuFF';
    if (!url) return fallback;
    if (url.includes('lh3.googleusercontent.com')) return url;
    const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
    return url;
  }


  statusLabel(s: string) {
    const map: Record<string,[string,string]> = {
      Pending:['รอดำเนินการ','Pending'], Approved:['อนุมัติแล้ว','Approved'],
      Rejected:['ปฏิเสธ','Rejected'], Cancelled:['ยกเลิก','Cancelled'],
    };
    return map[s] ? map[s][this.isEn ? 1 : 0] : s;
  }
  statusClass(s: string) { return { Pending:'badge-warning', Approved:'badge-success', Rejected:'badge-danger', Cancelled:'badge-gray' }[s] ?? 'badge-gray'; }

  // ─── trackBy helpers ──────────────────────────────────────
  trackByEventId(_: number, ev: any): string { return ev.event_id ?? _; }
  trackByLeaveId(_: number, lv: any): string { return lv.leave_id ?? _; }
  trackByActivityId(_: number, act: any): string { return act.activity_id ?? _; }
  trackByUserId(_: number, u: any): string { return u.user_id ?? _; }

  avatarFor(p: CoachPlayerStats): string {
    return p.img_avatar_url || mascotAvatarUri(p.user_id);
  }
}
