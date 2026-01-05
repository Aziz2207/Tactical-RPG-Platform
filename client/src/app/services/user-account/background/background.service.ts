import { Injectable, signal } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "src/environments/environment";
import { FireAuthService } from "../fire-auth/fire-auth.service";

export interface Background {
    url: string;
    price: number;
    title: string;
    owned: boolean;
}

export interface PurchaseResponse {
    message: string;
    newBalance: number;
    ownedBackgrounds: string[];
}

@Injectable({
    providedIn: "root",
})
export class BackgroundService {
    private readonly baseUrl = `${environment.serverUrl}/user`;

    ownedBackgrounds = signal<string[]>([]);
    selectedBackground = signal<string>(
        "./assets/images/backgrounds/title_page_bgd17.jpg"
    );
    availableBackgrounds = signal<Background[]>([]);
    balance = signal<number>(0);

    constructor(
        private http: HttpClient,
        private authService: FireAuthService
    ) {}

    private async getAuthHeaders(): Promise<HttpHeaders> {
        const token = await this.authService.getToken();
        return new HttpHeaders({
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        });
    }

    // GET /user/backgrounds/owned
    async getOwnedBackgrounds(): Promise<string[]> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.get<{ ownedBackgrounds: string[] }>(
                    `${this.baseUrl}/backgrounds/owned`,
                    { headers }
                )
            );
            this.ownedBackgrounds.set(response.ownedBackgrounds);
            return response.ownedBackgrounds;
        } catch (error) {
            console.error("Failed to get owned backgrounds:", error);
            throw error;
        }
    }

    // GET /user/backgrounds/selected
    async getSelectedBackground(): Promise<string> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.get<{ selectedBackground: string }>(
                    `${this.baseUrl}/backgrounds/selected`,
                    { headers }
                )
            );
            this.selectedBackground.set(response.selectedBackground);
            return response.selectedBackground;
        } catch (error) {
            console.error("Failed to get selected background:", error);
            throw error;
        }
    }

    // POST /user/backgrounds/select
    async selectBackground(backgroundURL: string): Promise<void> {
        try {
            const headers = await this.getAuthHeaders();
            await firstValueFrom(
                this.http.post<{ message: string; selectedBackground: string }>(
                    `${this.baseUrl}/backgrounds/select`,
                    { backgroundURL },
                    { headers }
                )
            );
            this.selectedBackground.set(backgroundURL);
        } catch (error) {
            console.error("Failed to select background:", error);
            throw error;
        }
    }

    // POST /user/backgrounds/purchase
    async purchaseBackground(
        backgroundURL: string,
        price: number
    ): Promise<PurchaseResponse> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.post<PurchaseResponse>(
                    `${this.baseUrl}/backgrounds/purchase`,
                    { backgroundURL, price },
                    { headers }
                )
            );

            this.ownedBackgrounds.set(response.ownedBackgrounds);
            this.balance.set(response.newBalance);

            return response;
        } catch (error) {
            console.error("Failed to purchase background:", error);
            throw error;
        }
    }

    // GET /user/backgrounds/available
    async getAvailableBackgrounds(): Promise<Background[]> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.get<{ availableBackgrounds: Background[] }>(
                    `${this.baseUrl}/backgrounds/available`,
                    { headers }
                )
            );

            if (
                !response.availableBackgrounds ||
                response.availableBackgrounds.length === 0
            ) {
                console.warn("No backgrounds returned from server!");
            }

            this.availableBackgrounds.set(response.availableBackgrounds || []);

            return response.availableBackgrounds || [];
        } catch (error) {
            console.error("Failed to get available backgrounds:", error);
            console.error("Error details:", error);
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
