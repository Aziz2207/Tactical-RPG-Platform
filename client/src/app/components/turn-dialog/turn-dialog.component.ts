import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TurnDialogData } from '@app/interfaces/turn-dialog-data';
import { CONSTANTS } from '@common/constants';

@Component({
    selector: 'app-turn-dialog',
    standalone: true,
    imports: [],
    templateUrl: './turn-dialog.component.html',
    styleUrls: ['./turn-dialog.component.scss'],
})
export class TurnDialogComponent implements OnInit, OnDestroy {
    progress: number = CONSTANTS.PROGRESS_PERCENTAGE;
    intervalId!: number;
    progressColor: string = 'green';

    constructor(@Inject(MAT_DIALOG_DATA) public data: TurnDialogData) {}

    ngOnInit(): void {
        const duration = CONSTANTS.END_TURN_DELAY;
        const step = CONSTANTS.PROGRESS_PERCENTAGE;
        const decrement = CONSTANTS.PROGRESS_PERCENTAGE / (duration / step);

        this.intervalId = window.setInterval(() => {
            this.progress = Math.max(0, this.progress - decrement);
            this.progressColor = this.getProgressColor(this.progress);

            if (this.progress === 0) {
                clearInterval(this.intervalId);
            }
        }, step);
    }

    ngOnDestroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    getProgressColor(progress: number): string {
        if (progress > CONSTANTS.PROGRESS_BAR_MEDIUM) {
            return 'green';
        } else if (progress > CONSTANTS.PROGRESS_BAR_LOW) {
            return 'yellow';
        } else {
            return 'red';
        }
    }
}
