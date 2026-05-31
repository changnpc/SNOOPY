import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ShellComponent } from './shell.component';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  {
    path: '', component: ShellComponent, canActivate: [AuthGuard],
    children: [
      { path: 'dashboard',  loadChildren: () => import('../dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'athletes',   loadChildren: () => import('../athletes/athletes.module').then(m => m.AthletesModule) },
      { path: 'attendance', loadChildren: () => import('../attendance/attendance.module').then(m => m.AttendanceModule) },
      { path: 'leave',      loadChildren: () => import('../leave/leave.module').then(m => m.LeaveModule) },
      { path: 'calendar',   loadChildren: () => import('../calendar/calendar.module').then(m => m.CalendarModule) },
      { path: 'activity',   loadChildren: () => import('../activity/activity.module').then(m => m.ActivityModule) },
      { path: 'practice',   loadChildren: () => import('../practice/practice.module').then(m => m.PracticeModule) },
      { path: 'teams',           loadChildren: () => import('../teams/teams.module').then(m => m.TeamsModule), canActivate: [AuthGuard], data: { roles: ['Super Admin'] } },
      { path: 'user-management', loadChildren: () => import('../user-management/user-management.module').then(m => m.UserManagementModule), canActivate: [AuthGuard], data: { roles: ['Super Admin'] } },
      { path: 'notifications', loadChildren: () => import('../notifications/notifications.module').then(m => m.NotificationsModule) },
      { path: 'profile',       loadChildren: () => import('../profile/profile.module').then(m => m.ProfileModule) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  declarations: [ShellComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class ShellModule {}
