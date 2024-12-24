import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
    selector: 'app-info-dialog',
    standalone: true,
    imports: [],
    templateUrl: './info-dialog.component.html',
    styleUrl: './info-dialog.component.scss',
})
export class InfoDialogComponent {
    constructor(
        private dialogRef: MatDialogRef<InfoDialogComponent>,
        private router: Router,
        @Inject(MAT_DIALOG_DATA) public data: { message: string },
    ) {}

    onReturnHome(): void {
        this.dialogRef.close();
        this.router.navigate(['/home']);
    }
}
