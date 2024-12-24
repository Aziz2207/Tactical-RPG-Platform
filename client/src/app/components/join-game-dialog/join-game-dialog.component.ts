import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';

@Component({
    selector: 'app-join-game-dialog',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './join-game-dialog.component.html',
    styleUrl: './join-game-dialog.component.scss',
})
export class JoinGameDialogComponent {
    joinForm: FormGroup;
    errorMessage: string = '';

    constructor(
        public dialogRef: MatDialogRef<JoinGameDialogComponent>,
        private formBuilder: FormBuilder,
        private roomManagerService: RoomManagerService,
        private router: Router,
    ) {
        this.joinForm = this.formBuilder.group({
            code: ['', [Validators.required, Validators.pattern(/^[0-9]{4}$/)]],
        });
    }

    onNextClick(): void {
        if (this.joinForm.valid) {
            this.roomManagerService
                .joinRoom(this.joinForm.get('code')?.value)
                .then(() => {
                    this.dialogRef.close();
                    this.router.navigate(['/characters']);
                })
                .catch((errorMessage: string) => {
                    this.errorMessage = errorMessage;
                });
        } else {
            this.errorMessage = 'Le code est invalide';
        }
    }

    onNoClick(): void {
        this.dialogRef.close();
    }
}
