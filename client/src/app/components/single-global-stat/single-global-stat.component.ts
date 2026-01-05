import { Component, Input } from '@angular/core';
import { PostGameService } from '@app/services/post-game/post-game.service';
import { GlobalPostGameStat, GlobalStatType } from '@common/interfaces/global-post-game-stats';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-single-global-stat',
    standalone: true,
    imports: [TranslateModule],
    templateUrl: './single-global-stat.component.html',
    styleUrl: './single-global-stat.component.scss',
})
export class SingleGlobalStatComponent {
    @Input() globalStat: GlobalPostGameStat;
    globalStatType = GlobalStatType;

    constructor(public postGameService: PostGameService) {}

    formatStatValue(): string {
        switch (this.globalStat.key) {
            case GlobalStatType.DoorsInteracted:
                return this.postGameService.doorsInteractedPercentage;
            case GlobalStatType.GlobalTilesVisited:
                return this.postGameService.globalTilesVisitedPercentage.toString() + '%';
            default:
                return this.postGameService.globalStats[this.globalStat.key].toString();
        }
    }
}
