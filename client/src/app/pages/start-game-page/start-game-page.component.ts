import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameDescriptionComponent } from '@app/components/game-description/game-description.component';
import { GameSelectionListComponent } from '@app/components/game-selection-list/game-selection-list.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { StartGameService } from '@app/services/start-game/start-game.service';

@Component({
    selector: 'app-start-game-page',
    standalone: true,
    imports: [HeaderComponent, GameSelectionListComponent, GameDescriptionComponent],
    templateUrl: './start-game-page.component.html',
    styleUrl: './start-game-page.component.scss',
})
export class StartGamePageComponent implements OnDestroy, OnInit {
    constructor(public startGameService: StartGameService) {}
    ngOnDestroy(): void {
        this.startGameService.reset();
    }

    ngOnInit(): void {
        this.startGameService.reset();
    }
}
