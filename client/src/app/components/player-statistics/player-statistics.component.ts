import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SinglePlayerStatComponent } from '@app/components/single-player-stat/single-player-stat.component';
import { ObjectType, PLAYER_STAT_TYPES, VICTORIES_FOR_WIN } from '@app/constants';
import { PostGameService } from '@app/services/post-game/post-game.service';
import { Player } from '@common/interfaces/player';
import { PostGameStat } from '@common/interfaces/post-game-stat';
@Component({
    selector: 'app-player-statistics',
    standalone: true,
    imports: [CommonModule, SinglePlayerStatComponent],
    templateUrl: './player-statistics.component.html',
    styleUrl: './player-statistics.component.scss',
})
export class PlayerStatisticsComponent {
    @Input() player: Player;
    @Input() selectedAttribute: string;
    playerStatTypes: PostGameStat[] = PLAYER_STAT_TYPES;

    constructor(
        private postGameService: PostGameService,
    ) {}

    isWinner() {
        if (this.postGameService.isFlagMode) {
            return this.player.inventory.find((item) => item.id === ObjectType.Flag);
        }
        return this.player.postGameStats.victories === VICTORIES_FOR_WIN;
    }

    getStatusClass(): string {
        return this.player.status;
    }

    getSocketId() {
        return this.postGameService.getSocketId();
    }
}
