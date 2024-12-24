import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-delete-game-dialog',
    standalone: true,
    imports: [MatDialogModule],
    templateUrl: './delete-game-dialog.component.html',
    styleUrl: './delete-game-dialog.component.scss',
})
export class DeleteGameDialogComponent {
    constructor(public dialogRef: MatDialogRef<DeleteGameDialogComponent>) {}

    onNoClick(): void {
        this.dialogRef.close();
    }
}
