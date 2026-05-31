import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { UserManagementComponent } from './user-management.component';

const routes: Routes = [{ path: '', component: UserManagementComponent }];

@NgModule({
  declarations: [UserManagementComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class UserManagementModule {}
