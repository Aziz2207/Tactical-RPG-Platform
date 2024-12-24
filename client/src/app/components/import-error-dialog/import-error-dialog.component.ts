import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-import-error-dialog',
    standalone: true,
    imports: [],
    templateUrl: './import-error-dialog.component.html',
    styleUrl: './import-error-dialog.component.scss',
})
export class ImportErrorDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ImportErrorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public message: string,
    ) {}

    onCloseClick(): void {
        this.dialogRef.close();
    }
}
