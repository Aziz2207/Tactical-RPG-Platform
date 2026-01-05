import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TileButtonName, TileClass } from '@app/constants';
import { ToolButtonService } from '@app/services/tool-button/tool-button.service';

@Component({
    selector: 'app-tool-button',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './tool-button.component.html',
    styleUrl: './tool-button.component.scss',
})
export class ToolButtonComponent {
    @Input() translationKey: string = '';
    isActive = false;

    constructor(
        private toolButtonService: ToolButtonService,
        private translate: TranslateService
    ) {}

    get translatedLabel(): string {
        return this.translate.instant(this.translationKey);
    }

    get class(): string {
        const baseClass = this.isActive ? 'active' : '';
        const inactiveClass = this.getInactiveClass();
        return `${baseClass} ${inactiveClass}`.trim();
    }

    toggleSelf() {
        this.toolButtonService.toggleButton(this);
    }

    toggleActivation() {
        this.isActive = !this.isActive;
    }

    private getInactiveClass(): string {
        switch (this.translationKey) {
            case TileButtonName.Water:
                return TileClass.Water;
            case TileButtonName.Ice:
                return TileClass.Ice;
            case TileButtonName.Wall:
                return TileClass.Wall;
            case TileButtonName.Door:
                return TileClass.Door;
            default:
                return '';
        }
    }
}
