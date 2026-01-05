import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TOTAL_PERCENTAGE } from '@app/constants';
import { PostGameService } from '@app/services/post-game/post-game.service';
import { Player, PostGameStats } from '@common/interfaces/player';
import { PlayerStatType } from '@common/interfaces/post-game-stat';

@Component({
    selector: 'app-single-player-stat',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './single-player-stat.component.html',
    styleUrl: './single-player-stat.component.scss',
})
export class SinglePlayerStatComponent {
    @Input() player: Player;
    @Input() selectedAttribute: string;
    @Input() attribute: string;

    // Used in html to access its attributes/functions
    constructor(public postGameService: PostGameService) {}

    getStatValue(): number {
        return this.player?.postGameStats[this.attribute as keyof Player['postGameStats']];
    }

    formatStatValue() {
        const formattedStat = this.getStatValue().toString();
        return this.attribute === PlayerStatType.TilesVisited ? formattedStat + '%' : formattedStat;
    }

    getAttrKey() {
        return this.attribute as keyof Player['postGameStats'];
    }

    hasBar(): boolean {
        return [PlayerStatType.DamageDealt as string, PlayerStatType.DamageTaken as string, PlayerStatType.TilesVisited as string].includes(
            this.attribute,
        );
    }

    isPercent(): boolean {
        return this.attribute === PlayerStatType.TilesVisited;
    }

    getBarWidth(attribute: number, statKey: keyof Player['postGameStats'], isPercent: boolean): number {
        const max = isPercent ? TOTAL_PERCENTAGE : this.postGameService.getMaxStat(statKey);
        return Math.min((attribute / max) * TOTAL_PERCENTAGE, TOTAL_PERCENTAGE);
    }

    getAttribute() {
        return this.attribute as keyof PostGameStats;
    }
}
