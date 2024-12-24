import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { StartGameService } from '@app/services/start-game/start-game.service';
import { Game } from '@common/interfaces/game';
import { ModeEnum } from '@common/mode-enum';
@Component({
    selector: 'app-game-description',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './game-description.component.html',
    styleUrl: './game-description.component.scss',
})
export class GameDescriptionComponent implements OnInit {
    modeEnum = ModeEnum;

    currentGame: Game | undefined;
    constructor(
        private startGameService: StartGameService,
        private roomManagerService: RoomManagerService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        this.startGameService.stateSelection$.subscribe((game) => {
            this.currentGame = game;
        });
    }

    loadGame(): void {
        if (this.currentGame) {
            this.roomManagerService.createRoom(this.currentGame.map).then(() => {
                this.router.navigate(['/characters']);
            });
        }
    }
}
