import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
    selector: 'app-game-info-dialog',
    standalone: true,
    imports: [],
    templateUrl: './game-info-dialog.component.html',
    styleUrl: './game-info-dialog.component.scss',
})
export class GameInfoDialogComponent {
    constructor(
        private router: Router,
        private dialogRef: MatDialogRef<GameInfoDialogComponent>,
    ) {}

    returnHome() {
        this.dialogRef.close();
        this.router.navigate(['/home']);
    }
}
