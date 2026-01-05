import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Player } from '@common/interfaces/player';

@Component({
    selector: 'app-combat-stats-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './combat-stats-bar.component.html',
    styleUrl: './combat-stats-bar.component.scss',
})
export class CombatStatsBarComponent {
    @Input() player: Player;
    @Input() isOnRightSide: boolean;
    @Input() isDamaged: boolean;
}
