import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { GameComponent } from './game.component';

const routes: Routes = [{ path: '', component: GameComponent }];

@NgModule({
  declarations: [GameComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class GameModule {}
