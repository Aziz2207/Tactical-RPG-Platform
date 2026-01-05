import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { GameTileInfoService } from '@app/services/game-tile-info/game-tile-info.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-tile-player-info',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './tile-player-info.component.html',
    styleUrl: './tile-player-info.component.scss',
})
export class TilePlayerInfoComponent {
    @Output() closePopup = new EventEmitter<void>();

    // Used in html to access its attributes/functions
    constructor(public gameTileInfoService: GameTileInfoService) {}

    close() {
        this.closePopup.emit();
    }
}
