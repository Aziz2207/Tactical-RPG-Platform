import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ROLL_DURATION } from '@app/constants';
@Component({
    selector: 'app-dice',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dice.component.html',
    styleUrl: './dice.component.scss',
})
export class DiceComponent {
    @Input() value: number = 1;
    isRolling: boolean = false;

    rollDice() {
        if (this.isRolling) return;
        this.isRolling = true;

        setTimeout(() => {
            this.isRolling = false;
        }, ROLL_DURATION);
    }
}
