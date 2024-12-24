import { Component, OnInit } from '@angular/core';
import { GameService, GameState } from '@app/services/game/game.service';
import { Item } from '@common/interfaces/item';

@Component({
    selector: 'app-inventory',
    standalone: true,
    imports: [],
    templateUrl: './inventory.component.html',
    styleUrl: './inventory.component.scss',
})
export class InventoryComponent implements OnInit {
    gameState: GameState;
    isVisible: boolean = false;

    constructor(public gameService: GameService) {}

    ngOnInit(): void {
        this.gameState = this.gameService.gameState;
        if (this.gameState) {
            this.gameService.setInventoryDialogHandler(() => {
                this.isVisible = true;
            });
        }
    }

    rejectItem(item: Item) {
        this.gameService.handleInventory(item);
        this.isVisible = false;
    }
}
