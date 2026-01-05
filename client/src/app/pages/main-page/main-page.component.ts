import { Component, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
import { HeaderComponent } from "@app/components/header/header.component";
import { BackgroundService } from "@app/services/user-account/background/background.service";
import { CommonModule } from "@angular/common";
import { ThemeService } from "@app/services/theme/theme.service";
import { ThemePurchaseService } from "@app/services/user-account/theme-purchase/theme-purchase.service";
import { Theme } from "@common/interfaces/theme";
import { TranslateModule } from "@ngx-translate/core";
import { LanguageService } from "@app/services/user-account/language/language.service";

interface MenuItem {
  route: string;
  labelKey: string;
}

@Component({
  selector: "app-main-page",
  standalone: true,
  templateUrl: "./main-page.component.html",
  styleUrls: ["./main-page.component.scss"],
  imports: [CommonModule, RouterLink, HeaderComponent, TranslateModule],
})
export class MainPageComponent implements OnInit {
  backgroundImageUrl = "";

  readonly menuItems: MenuItem[] = [
    { route: "/game-creation", labelKey: "PAGE_HEADER.CREATE_GAME" },
    { route: "/administration", labelKey: "PAGE_HEADER.MANAGE_GAME" },
    //{ route: '/join-game', labelKey: 'PAGE_HEADER.JOIN_GAME' },
    { route: "/waiting-rooms", labelKey: "PAGE_HEADER.JOIN_GAME" },
  ];

  constructor(
    private backgroundService: BackgroundService,
    private themeService: ThemeService,
    private themePurchaseService: ThemePurchaseService,
    private languageService: LanguageService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const selectedBg = await this.backgroundService.getSelectedBackground();
      if (selectedBg) {
        await this.preloadImage(selectedBg);
        this.backgroundImageUrl = selectedBg;
      }

      const selectedTheme = await this.themePurchaseService.getSelectedTheme();
      this.themeService.setTheme(selectedTheme as Theme);

      this.languageService.loadUserLanguage();
    } catch (error) {
      console.error("Failed to load background:", error);
    }
  }

  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        console.error("Failed to preload image:", url);
        reject();
      };
      img.src = url;
    });
  }
}
