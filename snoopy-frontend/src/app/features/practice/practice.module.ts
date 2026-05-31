import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { PracticeComponent } from './practice.component';

const routes: Routes = [{ path: '', component: PracticeComponent }];
@NgModule({ declarations: [PracticeComponent], imports: [SharedModule, RouterModule.forChild(routes)] })
export class PracticeModule {}
