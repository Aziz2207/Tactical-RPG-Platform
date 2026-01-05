import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FireAuthService } from '../fire-auth/fire-auth.service';
import { TranslateService } from '@ngx-translate/core';


interface Language {
  code: string;
  name: string;
}

interface LanguageResponse {
  selectedLanguage: string;
}

interface SetLanguageResponse {
  message: string;
  selectedLanguage: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly baseUrl = `${environment.serverUrl}/user`;

  selectedLanguage = signal<string>('en');
  languages: Language[] = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    // { code: 'es', name: 'Español' },
    // { code: 'cn', name: '中文' },
    // { code: 'ar', name: 'عربي' },
    // { code: 'kr', name: '한국인'},
    // { code: 'jp', name: '日本語' },
    // { code: 'ru', name: 'русский'},
    // { code: 'de', name: 'Deutsch' },
    // { code: 'gk', name: 'ελληνικά' },
  ];


  constructor(
    private http: HttpClient,
    private authService: FireAuthService,
    private translateService: TranslateService
  ) {}

    get currentLanguage(): Language | undefined {
    return this.languages.find(
      lang => lang.code === this.translateService.currentLang
    );
  }

  async loadUserLanguage(): Promise<void> {
    try {
      const selectedLanguage = await this.getSelectedLanguage();
      if (selectedLanguage) {
        this.translateService.use(selectedLanguage);
      }
    } catch (error) {
      console.error('Error loading user language:', error);
      // Fall back to default language
      const defaultLang = this.translateService.defaultLang || 'en';
      this.translateService.use(defaultLang);
    }
  }

  private async getAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // GET /user/language/selected
  async getSelectedLanguage(): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.get<LanguageResponse>(
          `${this.baseUrl}/language/selected`,
          { headers }
        )
      );
      this.selectedLanguage.set(response.selectedLanguage);
      return response.selectedLanguage;
    } catch (error) {
      console.error('Failed to get selected language:', error);
      throw error;
    }
  }

  // POST /user/language/select
  async setSelectedLanguage(language: string): Promise<SetLanguageResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.http.post<SetLanguageResponse>(
          `${this.baseUrl}/language/select`,
          { language },
          { headers }
        )
      );
      this.selectedLanguage.set(response.selectedLanguage);
      return response;
    } catch (error) {
      console.error('Failed to set selected language:', error);
      throw error;
    }
  }
}