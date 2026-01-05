import { Injectable, signal } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "src/environments/environment";
import { FireAuthService } from "../fire-auth/fire-auth.service";
import { Avatar } from "@common/interfaces/player";
import { DEFAULT_AVATARS } from "@common/avatars-info";

export interface AvatarPurchaseResponse {
    message: string;
    newBalance: number;
    ownedPurchasableAvatars: string[];
}

@Injectable({
    providedIn: "root",
})
export class AvatarsPurchaseService {
    private readonly baseUrl = `${environment.serverUrl}/user`;

    ownedPurchasableAvatars = signal<string[]>([]);
    availableAvatars = signal<Avatar[]>([]);
    avatars: Avatar[] = [];
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

    // GET /user/avatars/owned
    async getOwnedAvatars(): Promise<string[]> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.get<{ ownedPurchasableAvatars: string[] }>(
                    `${this.baseUrl}/avatars/owned`,
                    { headers }
                )
            );
            this.ownedPurchasableAvatars.set(response.ownedPurchasableAvatars);
            return response.ownedPurchasableAvatars;
        } catch (error) {
            console.error("Failed to get owned avatars:", error);
            throw error;
        }
    }

    // POST /user/avatars/purchase
    async purchaseAvatar(
        avatarURL: string,
        price: number
    ): Promise<AvatarPurchaseResponse> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.post<AvatarPurchaseResponse>(
                    `${this.baseUrl}/avatars/purchase`,
                    { avatarURL, price },
                    { headers }
                )
            );

            this.ownedPurchasableAvatars.set(response.ownedPurchasableAvatars);
            this.balance.set(response.newBalance);

            return response;
        } catch (error) {
            console.error("Failed to purchase avatar:", error);
            throw error;
        }
    }

    // GET /user/avatars/available
    async getAvailableAvatars(): Promise<Avatar[]> {
        try {
            const headers = await this.getAuthHeaders();
            const response = await firstValueFrom(
                this.http.get<{ availableAvatars: Avatar[] }>(
                    `${this.baseUrl}/avatars/available`,
                    { headers }
                )
            );

            if (
                !response.availableAvatars ||
                response.availableAvatars.length === 0
            ) {
                console.warn("No avatars returned from server!");
            }

            this.availableAvatars.set(response.availableAvatars || []);
            return response.availableAvatars || [];
        } catch (error) {
            console.error("Failed to get available avatars:", error);
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

    async loadAvatars(): Promise<Avatar[]> {
        try {
            const ownedAvatarURLs = (await this.getOwnedAvatars()) ?? [];

            if (ownedAvatarURLs.length === 0) {
                this.avatars = DEFAULT_AVATARS;
                return this.avatars;
            }

            const availableAvatars = await this.getAvailableAvatars();

            const ownedPurchasableAvatars = availableAvatars.filter((avatar: Avatar) =>
                ownedAvatarURLs.includes(avatar.src)
            );

            this.avatars = [...DEFAULT_AVATARS, ...ownedPurchasableAvatars];

            return this.avatars;
        } catch (error) {
            console.error('Failed to load avatars:', error);
            this.avatars = DEFAULT_AVATARS;
            return this.avatars;
        }
    }

}