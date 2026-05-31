import { Component } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'snoopy-frontend';
  // Inject so theme + language are applied at boot (incl. the login page)
  constructor(private theme: ThemeService, private lang: LanguageService) {
    this.lang.set(this.lang.lang);
  }
}
