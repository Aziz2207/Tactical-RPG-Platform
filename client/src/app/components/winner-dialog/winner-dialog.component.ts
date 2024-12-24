import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Player } from '@common/interfaces/player';

@Component({
    selector: 'app-winner-dialog',
    standalone: true,
    imports: [],
    templateUrl: './winner-dialog.component.html',
    styleUrl: './winner-dialog.component.scss',
})
export class WinnerDialogComponent {
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { winner: Player },
        private dialogRef: MatDialogRef<WinnerDialogComponent>,
        private router: Router,
    ) {}

    goToStats() {
        if (this.dialogRef) {
            this.dialogRef.close();
            this.router.navigate(['/end']);
        }
    }
}
