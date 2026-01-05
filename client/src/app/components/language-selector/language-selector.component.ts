import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { LanguageService } from "@app/services/user-account/language/language.service";

@Component({
    selector: "app-language-selector",
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: "./language-selector.component.html",
    styleUrl: "./language-selector.component.scss",
})
export class LanguageSelectorComponent implements OnInit {
    isOpen = false;
    isLoading = false;

    constructor(
        public translateService: TranslateService,
        public languageService: LanguageService
    ) {}

    async ngOnInit(): Promise<void> {
        await this.languageService.loadUserLanguage();
    }

    toggleDropdown(): void {
        this.isOpen = !this.isOpen;
    }

    async switchLanguage(langCode: string): Promise<void> {
        this.isLoading = true;

        try {
            // Save to backend
            const response = await this.languageService.setSelectedLanguage(
                langCode
            );

            // Update translation service
            this.translateService.use(langCode);
            this.isOpen = false;
            console.log("Language updated:", response.message);
        } catch (error) {
            console.error("Error updating language:", error);
            // Still update locally even if backend fails
            this.translateService.use(langCode);
            this.isOpen = false;
        } finally {
            this.isLoading = false;
        }
    }
}
