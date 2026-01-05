import { Component, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
import { HeaderComponent } from "@app/components/header/header.component";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import {
    BackgroundService,
    Background,
} from "@app/services/user-account/background/background.service";
import {
    AvatarsPurchaseService,
} from "@app/services/user-account/avatars-purchase/avatars-purchase.service";
import { Avatar } from "@common/interfaces/player";
import { CommonModule } from "@angular/common";
import { ThemePurchaseService } from "@app/services/user-account/theme-purchase/theme-purchase.service";
import { ThemeOption } from "@common/interfaces/theme";
import { TranslateModule } from "@ngx-translate/core";

@Component({
    selector: "app-store-page",
    standalone: true,
    imports: [HeaderComponent, RouterLink, CommonModule, TranslateModule],
    templateUrl: "./store-page.component.html",
    styleUrls: [
        "./store-page.component.scss",
        "../../../common/css/game-list-page.scss",
    ],
})
export class StorePageComponent implements OnInit {
    activeTab: "avatars" | "backgrounds" | "themes" = "avatars";
    isLoading = false;
    errorMessage = "";

    constructor(
        private socketService: SocketCommunicationService,
        private userAccountService: UserAccountService,
        public backgroundService: BackgroundService,
        public avatarService: AvatarsPurchaseService,
        public themePurchaseService: ThemePurchaseService
    ) {}

    async ngOnInit() {
        if (!this.socketService.isSocketAlive?.()) {
            await this.socketService.connect();
        }

        await this.loadBackgrounds();
        await this.loadAvatars();
        await this.loadThemes();
        await this.loadBalance();
    }

    async loadBackgrounds() {
        try {
            this.isLoading = true;
            const backgrounds =
                await this.backgroundService.getAvailableBackgrounds();
            console.log("Received backgrounds:", backgrounds);

            await this.backgroundService.getOwnedBackgrounds();
        } catch (error) {
            console.error("Error loading backgrounds:", error);
            this.errorMessage = "Impossible de charger les fonds d'écran";
        } finally {
            this.isLoading = false;
        }
    }

    async loadAvatars() {
        try {
            this.isLoading = true;
            const avatars = await this.avatarService.getAvailableAvatars();
            console.log("Received avatars:", avatars);
            await this.avatarService.getOwnedAvatars();
        } catch (error) {
            console.error("Error loading avatars:", error);
            this.errorMessage = "Impossible de charger les avatars";
        } finally {
            this.isLoading = false;
        }
    }

    async loadThemes() {
        try {
            this.isLoading = true;
            const themes = await this.themePurchaseService.getAvailableThemes();
            console.log("Received themes:", themes);
        } catch (error) {
            console.error("Error loading themes:", error);
            this.errorMessage = "Impossible de charger les thèmes";
        } finally {
            this.isLoading = false;
        }
    }

    async loadBalance() {
        try {
            await this.backgroundService.getBalance();
        } catch (error) {
            console.error("Error loading balance:", error);
        }
    }

    setActiveTab(tab: "avatars" | "backgrounds" | "themes") {
        this.activeTab = tab;
    }

    async purchaseBackground(background: Background) {
        if (background.owned) {
            this.errorMessage = "Vous possédez déjà ce fond d'écran";
            return;
        }

        if (this.backgroundService.balance() < background.price) {
            this.errorMessage = "Solde insuffisant";
            return;
        }

        try {
            this.isLoading = true;
            this.errorMessage = "";

            const result = await this.backgroundService.purchaseBackground(
                background.url,
                background.price
            );

            this.userAccountService.updateBalance(result.newBalance);
            await this.loadBackgrounds();
        } catch (error) {
            console.error("Error purchasing background:", error);
            this.errorMessage = "Échec de l'achat. Veuillez réessayer.";
        } finally {
            this.isLoading = false;
        }
    }

    async purchaseAvatar(avatar: Avatar) {
        if (avatar.owned) {
            this.errorMessage = "Vous possédez déjà cet avatar";
            return;
        }

        if (this.backgroundService.balance() < avatar.price) {
            this.errorMessage = "Solde insuffisant";
            return;
        }

        try {
            this.isLoading = true;
            this.errorMessage = "";

            const result = await this.avatarService.purchaseAvatar(
                avatar.src,
                avatar.price
            );

            this.userAccountService.updateBalance(result.newBalance);
            await this.loadAvatars();
        } catch (error) {
            console.error("Error purchasing avatar:", error);
            this.errorMessage = "Échec de l'achat. Veuillez réessayer.";
        } finally {
            this.isLoading = false;
        }
    }

    async purchaseTheme(theme: ThemeOption) {
        if (theme.owned) {
            this.errorMessage = "Vous possédez déjà ce thème";
            return;
        }

        if (this.backgroundService.balance() < theme.price) {
            this.errorMessage = "Solde insuffisant";
            return;
        }

        try {
            this.isLoading = true;
            this.errorMessage = "";

            const result = await this.themePurchaseService.purchaseTheme(
                theme.value,
                theme.price
            );

            this.userAccountService.updateBalance(result.newBalance);
            await this.loadThemes();
        } catch (error) {
            console.error("Error purchasing theme:", error);
            this.errorMessage = "Échec de l'achat. Veuillez réessayer.";
        } finally {
            this.isLoading = false;
        }
    }
}