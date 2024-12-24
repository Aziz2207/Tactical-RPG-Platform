import { NgClass } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { CONSTANTS } from '@common/constants';

@Component({
    selector: 'app-dice',
    standalone: true,
    imports: [NgClass],
    templateUrl: './dice.component.html',
    styleUrl: './dice.component.scss',
})
export class DiceComponent implements OnChanges {
    @Input() roleResult: number;
    currentRollClass: string;

    ngOnChanges(): void {
        this.animateRoll();
    }

    animateRoll(): void {
        this.currentRollClass = 'rolling';
        setTimeout(() => {
            this.currentRollClass = 'roll-' + this.roleResult;
        }, CONSTANTS.ROLL_DICE_DURATION);
    }
}
