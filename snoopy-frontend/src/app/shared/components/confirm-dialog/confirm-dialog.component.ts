import { Component } from '@angular/core';
import { ConfirmService, ConfirmOptions } from '../../../core/services/confirm.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  constructor(public svc: ConfirmService, public lang: LanguageService) {}
  confirm()  { this.svc.resolve(true);  }
  cancel()   { this.svc.resolve(false); }
}
