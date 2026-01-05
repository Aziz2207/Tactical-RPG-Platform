import { Injectable, signal } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "src/environments/environment";
import { FireAuthService } from "../fire-auth/fire-auth.service";
import { Theme } from '@common/interfaces/theme';
import { THEMES_CATALOG } from "@app/constants";
import { ThemeOption } from "@common/interfaces/theme";

export interface PurchaseThemeResponse {
    message: string;
    newBalance: number;
    ownedThemes: string[];
}

@Injectable({
    providedIn: "root",
})
export class ThemePurchaseService {
    private readonly baseUrl = `${environment.serverUrl}/user`;

    ownedThemes = signal<string[]>([Theme.Gold]);
    selectedTheme = signal<string>(Theme.Gold);
    availableThemes = signal<ThemeOption[]>([]);
    balance = signal<number>(0);

    constructor(
        private http: HttpClient,
        private authService: FireAuthService
    ) {
        this.updateAvailableThemes();
    }

    private async getAuthHeaders(): Promise<HttpHeaders> {
        const token = await this.authService.getToken();
        return new HttpHeaders({
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        });
    }

    private updateAvailableThemes(): void {
        const owned = this.ownedThemes();
        const themes = THEMES_CATALOG.map(theme => ({
            ...theme,
            owned: owned.includes(theme.value)
        }));
        this.availableThemes.set(themes);
    }

    // GET /user/themes/owned
    async getOwnedThemes(): Promise<string[]> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.get<{ ownedThemes: string[] }>(
                    `${this.baseUrl}/themes/owned`,
                    { headers }
                )
            );
            this.ownedThemes.set(response.ownedThemes);
            this.updateAvailableThemes();
            return response.ownedThemes;
        } catch (error) {
            console.error("Failed to get owned themes:", error);
            throw error;
        }
    }

    // GET /user/themes/selected
    async getSelectedTheme(): Promise<string> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.get<{ selectedTheme: string }>(
                    `${this.baseUrl}/themes/selected`,
                    { headers }
                )
            );
            this.selectedTheme.set(response.selectedTheme);
            return response.selectedTheme;
        } catch (error) {
            console.error("Failed to get selected theme:", error);
            throw error;
        }
    }

    // POST /user/themes/select
    async selectTheme(theme: string): Promise<void> {
        try {
            const headers = await this.getAuthHeaders();
            await firstValueFrom(
                this.http.post<{ message: string; selectedTheme: string }>(
                    `${this.baseUrl}/themes/select`,
                    { theme },
                    { headers }
                )
            );
            this.selectedTheme.set(theme);
        } catch (error) {
            console.error("Failed to select theme:", error);
            throw error;
        }
    }

    // POST /user/themes/purchase
    async purchaseTheme(
        theme: string,
        price: number
    ): Promise<PurchaseThemeResponse> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.post<PurchaseThemeResponse>(
                    `${this.baseUrl}/themes/purchase`,
                    { theme, price },
                    { headers }
                )
            );

            this.ownedThemes.set(response.ownedThemes);
            this.balance.set(response.newBalance);
            this.updateAvailableThemes();

            return response;
        } catch (error) {
            console.error("Failed to purchase theme:", error);
            throw error;
        }
    }

    // GET /user/themes/available
    async getAvailableThemes(): Promise<ThemeOption[]> {
        try {
            await this.getOwnedThemes();
            
            return this.availableThemes();
        } catch (error) {
            console.error("Failed to get available themes:", error);
            throw error;
        }
    }

    // GET /user/balance
    async getBalance(): Promise<number> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.get<{ balance: number }>(`${this.baseUrl}/balance`, {
                    headers,
                })
            );
            this.balance.set(response.balance);
            return response.balance;
        } catch (error) {
            console.error("Failed to get balance:", error);
            throw error;
        }
    }
}