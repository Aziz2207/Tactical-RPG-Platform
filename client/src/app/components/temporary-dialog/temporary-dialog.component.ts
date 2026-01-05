import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SimpleDialogMessageComponent } from '@app/components/simple-dialog-message/simple-dialog-message.component';
import { TempDialogData } from '@app/interfaces/temp-dialog-data';

@Component({
    selector: 'app-temporary-dialog',
    standalone: true,
    imports: [MatDialogModule, CommonModule, SimpleDialogMessageComponent],
    templateUrl: './temporary-dialog.component.html',
    styleUrls: ['./temporary-dialog.component.scss'],
})
export class TemporaryDialogComponent {
    constructor(
        private dialogRef: MatDialogRef<TemporaryDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: TempDialogData,
    ) {
        setTimeout(() => {
            this.dialogRef.close();
        }, data.duration);
    }
}
