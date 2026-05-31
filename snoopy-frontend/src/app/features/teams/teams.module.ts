import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { TeamsComponent } from './teams.component';

const routes: Routes = [{ path: '', component: TeamsComponent }];
@NgModule({ declarations: [TeamsComponent], imports: [SharedModule, RouterModule.forChild(routes)] })
export class TeamsModule {}
