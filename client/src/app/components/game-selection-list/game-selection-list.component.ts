import { Component, OnInit } from '@angular/core';
import { GameItemComponent } from '@app/components/game-item/game-item.component';
import { StartGameService } from '@app/services/start-game/start-game.service';
import { Game } from '@common/interfaces/game';

@Component({
    selector: 'app-game-selection-list',
    standalone: true,
    imports: [GameItemComponent],
    templateUrl: './game-selection-list.component.html',
    styleUrl: './game-selection-list.component.scss',
})
export class GameSelectionListComponent implements OnInit {
    gameList: { title: string; _id: string; isVisible: boolean }[] | undefined;
    selectedGame: Game | undefined;

    constructor(private startGameService: StartGameService) {}

    ngOnInit(): void {
        this.startGameService.stateList$.subscribe((state) => {
            this.gameList = state;
            if (this.gameList && this.gameList.length > 0) {
                this.selectGame(this.gameList[0]._id);
            }
        });
        this.startGameService.stateSelection$.subscribe((state) => {
            this.selectedGame = state;
        });
    }

    selectGame(id: string) {
        this.startGameService.selectGame(id);
    }
}
