import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { GameService } from '@app/services/game/game.service';
import { CONSTANTS } from '@common/constants';
import { GlobalStats } from '@common/interfaces/global-stats';
import { PlayerStats } from '@common/interfaces/player-stats';

@Component({
    selector: 'app-end-game-stats',
    templateUrl: './game-end.component.html',
    styleUrls: ['./game-end.component.scss'],
    standalone: true,
    imports: [ChatComponent],
})
export class GameEndComponent implements OnInit, OnDestroy {
    playerStats: PlayerStats[] = [];
    sortedPlayerStats: PlayerStats[] = [];
    globalStats: GlobalStats;
    isCTFMode: boolean = false;
    sortColumn: keyof PlayerStats = 'username';
    sortDirection: 'asc' | 'desc' = 'asc';

    constructor(
        private gameService: GameService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        if (
            !this.gameService.gameState ||
            !this.gameService.gameOverStats ||
            !this.gameService.gameOverStats.playerStats ||
            this.gameService.gameOverStats.playerStats.length === 0
        ) {
            this.returnToHome();
            return;
        }

        this.playerStats = this.gameService.gameOverStats.playerStats;
        this.sortedPlayerStats = [...this.playerStats];
        this.globalStats = this.gameService.gameOverStats.globalStats;
        this.isCTFMode = !!this.globalStats && !!this.globalStats.totalFlagHoldersCount && this.globalStats.totalFlagHoldersCount > 0;
    }

    formatDuration(duration: number): string {
        const minutes = Math.floor(duration / CONSTANTS.SECONDS_IN_MINUTE);
        const seconds = duration % CONSTANTS.SECONDS_IN_MINUTE;
        return `${minutes}:${seconds < CONSTANTS.TIME_FORMATTING ? '0' : ''}${seconds}`;
    }

    sortTable(column: keyof PlayerStats): void {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.sortedPlayerStats = [...this.playerStats].sort((a, b) => {
            const aValue = a[column];
            const bValue = b[column];
            if (aValue === undefined || bValue === undefined) {
                return 0;
            }
            if (aValue < bValue) {
                return this.sortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return this.sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    ngOnDestroy(): void {
        this.gameService.leaveEndView();
        this.gameService.quitGame();
    }

    returnToHome(): void {
        this.router.navigate(['/home']);
    }
}
