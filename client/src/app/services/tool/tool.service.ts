import { Injectable } from '@angular/core';
import { TileId } from '@app/constants';
import { ToolButtonService } from '@app/services/tool-button/tool-button.service';

@Injectable({
    providedIn: 'root',
})
export class ToolService {
    selectedTile: TileId | '';

    constructor(private toolButtonService: ToolButtonService) {}

    setSelectedTile(tile: TileId | '') {
        this.selectedTile = this.selectedTile !== tile ? tile : '';
    }

    getSelectedTile() {
        return this.selectedTile;
    }

    deactivateTileApplicator() {
        this.setSelectedTile('');

        if (this.toolButtonService.selectedButton) {
            this.toolButtonService.selectedButton.toggleActivation();
            this.toolButtonService.selectedButton = null;
        }
    }
}
