import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AthletesComponent } from './athletes.component';

const routes: Routes = [{ path: '', component: AthletesComponent }];

@NgModule({
  declarations: [AthletesComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class AthletesModule {}
