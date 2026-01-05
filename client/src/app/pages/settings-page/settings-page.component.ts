import { Component, effect, OnDestroy, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { HeaderComponent } from "@app/components/header/header.component";
import { BackgroundService } from "@app/services/user-account/background/background.service";
import { ThemeService } from "@app/services/theme/theme.service";
import { Theme } from "@common/interfaces/theme";
import { AVATARS, REVERSED_MODIFY_USER_ERRORS } from "@app/constants";
import { ThemePurchaseService } from "@app/services/user-account/theme-purchase/theme-purchase.service";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { LanguageSelectorComponent } from "@app/components/language-selector/language-selector.component";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTabsModule } from "@angular/material/tabs";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import {
  ClientToServerEvent,
  ServerToClientEvent,
} from "@common/socket.events";
import { UserStatistics } from "@common/interfaces/user-statistics";
import { MatButtonModule } from "@angular/material/button";
import { MatInputModule } from "@angular/material/input";
import { MatCardModule } from "@angular/material/card";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmationDialogComponent } from "@app/components/confirmation-dialog/confirmation-dialog.component";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import {
  LucideAngularModule,
  UserPen,
  Flag,
  Sword,
  Hourglass,
  Trophy,
  Swords,
} from "lucide-angular";
import { AvatarSelectorComponent } from "@app/components/avatar-selector/avatar-selector.component";
import { SimpleDialogComponent } from "@app/components/simple-dialog/simple-dialog.component";
import { HttpErrorResponse } from "@angular/common/http";

@Component({
  selector: "app-settings-page",
  standalone: true,
  imports: [
    HeaderComponent,
    RouterLink,
    CommonModule,
    TranslateModule,
    LanguageSelectorComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    LucideAngularModule,
    AvatarSelectorComponent,
  ],
  templateUrl: "./settings-page.component.html",
  styleUrl: "./settings-page.component.scss",
})
export class SettingsPageComponent implements OnInit, OnDestroy {
  activeTab: "visual" | "account" | "statistics" = "visual";
  userStats: UserStatistics | null = null;
  isLoadingStats = true;
  isEditing = false;
  isLoading = false;
  currentTheme: Theme = Theme.Gold;
  public Theme = Theme;
  avatars = AVATARS;
  private retryInterval?: number;

  readonly UserPen = UserPen;
  readonly Flag = Flag;
  readonly Sword = Sword;
  readonly Hourglass = Hourglass;
  readonly Trophy = Trophy;
  readonly Swords = Swords;

  form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    username: [
      "",
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^\S*$/),
      ],
    ],
    avatarURL: [""],
  });

  constructor(
    public backgroundService: BackgroundService,
    private themeService: ThemeService,
    public themePurchaseService: ThemePurchaseService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private userAccountService: UserAccountService,
    private socketService: SocketCommunicationService,
    private translate: TranslateService
  ) {
    effect(() => {
      this.form.patchValue(this.userAccountService.accountDetails());
    });
  }

  async ngOnInit() {
    this.form.patchValue(this.userAccountService.accountDetails());
    await this.socketService.connect();
    
    this.socketService.on<UserStatistics>(
      ServerToClientEvent.UserStatistics,
      (statistics: UserStatistics) => {
        console.log(statistics);
        this.userStats = {
          uid: statistics.uid,
          numOfClassicPartiesPlayed: statistics.numOfClassicPartiesPlayed,
          numOfCTFPartiesPlayed: statistics.numOfCTFPartiesPlayed,
          numOfPartiesWon: statistics.numOfPartiesWon,
          gameDurationsForPlayer: statistics.gameDurationsForPlayer,
          challengesCompleted: statistics.challengesCompleted
        };
        this.isLoadingStats = false;
        
        // Clear retry interval once data is received
        if (this.retryInterval) {
          clearInterval(this.retryInterval);
          this.retryInterval = undefined;
        }
      }
    );

    // Send initial request
    this.socketService.send(ClientToServerEvent.GetUserStatistics);
    
    // Retry logic: if stats not received after 3 seconds, retry up to 2 times
    let retryCount = 0;
    const maxRetries = 2;
    const retryDelay = 3000;
    
    this.retryInterval = window.setInterval(() => {
      if (!this.userStats && retryCount < maxRetries) {
        console.warn(`Statistics not received, retrying... (${retryCount + 1}/${maxRetries})`);
        this.socketService.send(ClientToServerEvent.GetUserStatistics);
        retryCount++;
      } else {
        if (this.retryInterval) {
          clearInterval(this.retryInterval);
          this.retryInterval = undefined;
        }
        
        if (!this.userStats && retryCount >= maxRetries) {
          console.error('Failed to receive statistics after maximum retries');
          this.isLoadingStats = false;
          this.showErrorMessage(
            this.translate.instant("SETTINGS_PAGE.DIALOG.ERROR_TITLE"),
            this.translate.instant("SETTINGS_PAGE.DIALOG.STATS_LOAD_FAILED")
          );
        }
      }
    }, retryDelay);
    
    await this.loadBackgroundData();
    await this.loadThemeData();

    this.themeService.currentTheme$.subscribe((theme) => {
      this.currentTheme = theme;
    });
  }

  async loadThemeData() {
    try {
      this.isLoading = true;
      await this.themePurchaseService.getOwnedThemes();
      await this.themePurchaseService.getSelectedTheme();
    } catch (error) {
      console.error("Error loading theme data:", error);
      this.showErrorMessage(
        this.translate.instant("SETTINGS_PAGE.DIALOG.ERROR_TITLE"),
        this.translate.instant("SETTINGS_PAGE.DIALOG.LOAD_THEME_DATA_FAILED")
      );
    } finally {
      this.isLoading = false;
    }
  }

  async setTheme(theme: Theme): Promise<void> {
    try {
      this.themeService.setTheme(theme);
      await this.themePurchaseService.selectTheme(theme);
    } catch (error) {
      console.error("Error setting theme:", error);
      this.showErrorMessage(
        this.translate.instant("SETTINGS_PAGE.DIALOG.ERROR_TITLE"),
        this.translate.instant("SETTINGS_PAGE.DIALOG.CHANGE_THEME_FAILED")
      );
    }
  }

  ngOnDestroy() {
    this.socketService.off(ServerToClientEvent.UserStatistics);
    
    // Clear retry interval if component is destroyed
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = undefined;
    }
  }

  get ownedThemeOptions() {
    const ownedThemes = this.themePurchaseService.ownedThemes();
    return this.themePurchaseService
      .availableThemes()
      .filter((option) => ownedThemes.includes(option.value));
  }

  async loadBackgroundData() {
    try {
      this.isLoading = true;
      await this.backgroundService.getOwnedBackgrounds();
      await this.backgroundService.getSelectedBackground();
    } catch (error) {
      console.error("Error loading background data:", error);
      this.showErrorMessage(
        this.translate.instant("SETTINGS_PAGE.DIALOG.ERROR_TITLE"),
        this.translate.instant("SETTINGS_PAGE.DIALOG.BACKGROUND_ERROR")
      );
    } finally {
      this.isLoading = false;
    }
  }

  async deleteAccount() {
    this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: this.translate.instant(
          "SETTINGS_PAGE.DIALOG.DELETE_ACCOUNT_TITLE"
        ),
        message: this.translate.instant(
          "SETTINGS_PAGE.DIALOG.DELETE_ACCOUNT_MESSAGE"
        ),
        onAgreed: await this.userAccountService.deleteUserAccount.bind(
          this.userAccountService
        ),
      },
    });
  }
  
  setActiveTab(tab: "visual" | "account" | "statistics") {
    this.activeTab = tab;
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
  }

  async saveChanges() {
    if (this.form.invalid) return;
    const current = this.form.value;
    if (
      current.avatarURL ===
        this.userAccountService.accountDetails().avatarURL &&
      current.email === this.userAccountService.accountDetails().email &&
      current.username === this.userAccountService.accountDetails().username
    ) {
      console.log("No changes detected. Update skipped.");
      this.showErrorMessage(
        this.translate.instant("SETTINGS_PAGE.DIALOG.NO_CHANGES_TITLE"),
        this.translate.instant("SETTINGS_PAGE.DIALOG.NO_CHANGES_MESSAGE")
      );
      return;
    }
    this.isLoading = true;
    try {
      const { email, username, avatarURL } = this.form.value;
      await this.userAccountService
        .updateAccountDetails(email!, username!, avatarURL!)
        .then(() => {
          this.isEditing = false;
          this.showErrorMessage(
            this.translate.instant(
              "SETTINGS_PAGE.DIALOG.ACCOUNT_UPDATED_TITLE"
            ),
            this.translate.instant(
              "SETTINGS_PAGE.DIALOG.ACCOUNT_UPDATED_MESSAGE"
            )
          );
        })
        .catch((errorResponse: HttpErrorResponse) => {
          console.error(errorResponse.error);
          this.showErrorMessage(
            this.translate.instant("SETTINGS_PAGE.DIALOG.ERROR_TITLE"),
            this.translate.instant(
              REVERSED_MODIFY_USER_ERRORS[errorResponse.error]
            ) || errorResponse.error
          );
        });
    } catch (error: any) {
      this.showErrorMessage(
        this.translate.instant("SETTINGS_PAGE.DIALOG.ERROR_TITLE"),
        this.translate.instant("SETTINGS_PAGE.DIALOG.ACCOUNT_UPDATE_FAILED")
      );
    } finally {
      this.isLoading = false;
    }
  }

  discardChanges() {
    this.isEditing = false;
    this.form.patchValue(this.userAccountService.accountDetails());
  }

  onAvatarSelected($event: string) {
    this.form.patchValue({ avatarURL: $event });
  }

  formatDuration(durations: number[]): string {
    const avgGameDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;
    const hours = Math.floor(avgGameDuration / 3600);
    const minutes = Math.floor((avgGameDuration % 3600) / 60);
    const seconds = Math.floor(avgGameDuration % 60);
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");
  }

  async selectBackground(backgroundUrl: string) {
    if (!this.isBackgroundOwned(backgroundUrl)) {
      this.showErrorMessage(
        this.translate.instant("SETTINGS_PAGE.DIALOG.ERROR_TITLE"),
        this.translate.instant("SETTINGS_PAGE.DIALOG.BACKGROUND_NOT_OWNED")
      );
      return;
    }

    try {
      this.isLoading = true;
      await this.backgroundService.selectBackground(backgroundUrl);
    } catch (error) {
      console.error("Error selecting background:", error);
      this.showErrorMessage(
        this.translate.instant("SETTINGS_PAGE.DIALOG.ERROR_TITLE"),
        this.translate.instant("SETTINGS_PAGE.DIALOG.SELECT_BACKGROUND_FAILED")
      );
    } finally {
      this.isLoading = false;
    }
  }

  isBackgroundOwned(backgroundUrl: string): boolean {
    return this.backgroundService.ownedBackgrounds().includes(backgroundUrl);
  }

  isBackgroundSelected(backgroundUrl: string): boolean {
    return this.backgroundService.selectedBackground() === backgroundUrl;
  }
  
  private showErrorMessage(title: string, message: string) {
    this.dialog.open(SimpleDialogComponent, {
      data: {
        title: title,
        messages: [message],
        options: [this.translate.instant("DIALOG.CLOSE")],
        confirm: false,
      },
    });
  }
}