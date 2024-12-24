import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-edit-error-dialog',
    standalone: true,
    imports: [],
    templateUrl: './edit-error-dialog.component.html',
    styleUrl: './edit-error-dialog.component.scss',
})
export class EditErrorDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<EditErrorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { message: string },
    ) {}

    onCloseClick(): void {
        this.dialogRef.close();
    }
}
