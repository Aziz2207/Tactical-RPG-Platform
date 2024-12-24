import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommunicationService } from '@app/services/communication/communication.service';

@Component({
    selector: 'app-import-dialog',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './import-dialog.component.html',
    styleUrl: './import-dialog.component.scss',
})
export class ImportDialogComponent {
    renameForm: FormGroup;
    errorMessage: string = '';

    constructor(
        public dialogRef: MatDialogRef<ImportDialogComponent>,
        private formBuilder: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: { currentTitle: string },
        private communicationService: CommunicationService,
    ) {
        this.renameForm = this.formBuilder.group({
            newTitle: [data.currentTitle, Validators.required],
        });
    }

    onConfirm(): void {
        const newTitle = this.renameForm.get('newTitle')?.value.trim();

        if (!newTitle) {
            this.errorMessage = 'Le nom ne peut pas être vide';
            return;
        }

        this.communicationService.gamesGet().subscribe({
            next: (games) => {
                const titleExists = games.some((game) => game.title.toLowerCase() === newTitle.toLowerCase());
                if (titleExists) {
                    this.errorMessage = 'Le nom existe déjà';
                } else {
                    this.dialogRef.close(newTitle);
                }
            },
            error: () => {
                this.errorMessage = 'Une erreur est survenue lors de la vérification du titre';
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close(null);
    }
}
