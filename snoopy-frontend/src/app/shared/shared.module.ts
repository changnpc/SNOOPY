import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { ToastComponent } from './components/toast/toast.component';
import { DatePickerComponent } from './components/date-picker/date-picker.component';
import { TimePickerComponent } from './components/time-picker/time-picker.component';
import { ColorPaletteComponent } from './components/color-palette/color-palette.component';
import { UiSelectComponent } from './components/ui-select/ui-select.component';
import { TranslatePipe } from './pipes/translate.pipe';
import { RealbridgeLinkPipe } from './pipes/realbridge-link.pipe';
import { AvatarPipe, RoleBadgePipe, LocalizedDatePipe, TeamNamePipe } from './pipes/display.pipes';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@NgModule({
  declarations: [
    SidebarComponent,
    TopbarComponent,
    ToastComponent,
    DatePickerComponent,
    TimePickerComponent,
    ColorPaletteComponent,
    UiSelectComponent,
    TranslatePipe,
    RealbridgeLinkPipe,
    AvatarPipe,
    RoleBadgePipe,
    LocalizedDatePipe,
    TeamNamePipe,
    ConfirmDialogComponent,
  ],
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SidebarComponent,
    TopbarComponent,
    ToastComponent,
    DatePickerComponent,
    TimePickerComponent,
    ColorPaletteComponent,
    UiSelectComponent,
    TranslatePipe,
    RealbridgeLinkPipe,
    AvatarPipe,
    RoleBadgePipe,
    LocalizedDatePipe,
    TeamNamePipe,
    ConfirmDialogComponent,
  ],
})
export class SharedModule {}
