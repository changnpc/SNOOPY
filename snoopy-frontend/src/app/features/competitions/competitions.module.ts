import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { CompetitionsComponent } from './competitions.component';

const routes: Routes = [{ path: '', component: CompetitionsComponent }];

@NgModule({
  declarations: [CompetitionsComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class CompetitionsModule {}
