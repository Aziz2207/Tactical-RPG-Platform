import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-quit-dialog',
    standalone: true,
    imports: [],
    templateUrl: './quit-dialog.component.html',
    styleUrl: './quit-dialog.component.scss',
})
export class QuitDialogComponent {
    constructor(public dialogRef: MatDialogRef<QuitDialogComponent>) {}

    yesClick() {
        this.dialogRef.close('yes');
    }

    noClick() {
        this.dialogRef.close('no');
    }
}
