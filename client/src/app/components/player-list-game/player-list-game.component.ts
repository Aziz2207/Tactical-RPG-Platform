import { CommonModule } from '@angular/common';
import { Component, effect, OnDestroy, OnInit } from '@angular/core';
import { GameService } from '@app/services/game/game.service';
import { Player } from '@common/interfaces/player';

@Component({
    selector: 'app-player-list-game',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './player-list-game.component.html',
    styleUrl: './player-list-game.component.scss',
})
export class PlayerListGameComponent implements OnInit, OnDestroy {
    players: Player[];
    initplayer: Player[];
    playersIn: boolean = false;
    hasFlag: boolean;
    constructor(public gameService: GameService) {
        effect(() => {
            this.players = this.gameService.getPlayers();
            if (!this.playersIn && this.players.length > 0) {
                this.initplayer = this.players.map((player) => ({ ...player }));
                this.playersIn = true;
            }
        });
    }

    get servicePlayers(): Player[] {
        if (this.gameService) {
            return this.gameService.gameState.players;
        }
        return [];
    }

    ngOnInit(): void {
        this.players = this.gameService.gameState.players;
    }

    ngOnDestroy(): void {
        this.playersIn = false;
    }

    isPlayerDeleted(player: Player): boolean {
        return !this.players.some((p) => p.userName === player.userName);
    }
}
