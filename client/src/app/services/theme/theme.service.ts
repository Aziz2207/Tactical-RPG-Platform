import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Theme } from '@common/interfaces/theme';
import { ThemePurchaseService } from '../user-account/theme-purchase/theme-purchase.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  private currentThemeSubject: BehaviorSubject<Theme>;
  public currentTheme$: Observable<Theme>;

  constructor(private themePurchaseService: ThemePurchaseService) {
    const savedTheme = this.getSavedTheme();
    this.currentThemeSubject = new BehaviorSubject<Theme>(savedTheme);
    this.currentTheme$ = this.currentThemeSubject.asObservable();
    this.applyTheme(savedTheme);
  }

  private getSavedTheme(): Theme {
    const saved = localStorage.getItem(this.THEME_KEY) as Theme;
    return Object.values(Theme).includes(saved) ? saved : Theme.Gold;
  }

  public setTheme(theme: Theme): void {
    this.currentThemeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
    this.themePurchaseService.selectTheme(theme);
  }

  public getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  private applyTheme(theme: Theme): void {
    Object.values(Theme).forEach(t => {
      document.body.classList.remove(`theme-${t}`);
    });
    
    document.body.setAttribute('data-theme', theme);
    document.body.classList.add(`theme-${theme}`);
  }

  public getAllThemes(): Theme[] {
    return Object.values(Theme);
  }
}