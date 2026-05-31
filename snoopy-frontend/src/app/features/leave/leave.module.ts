import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { LeaveComponent } from './leave.component';

const routes: Routes = [{ path: '', component: LeaveComponent }];
@NgModule({ declarations: [LeaveComponent], imports: [SharedModule, RouterModule.forChild(routes)] })
export class LeaveModule {}
