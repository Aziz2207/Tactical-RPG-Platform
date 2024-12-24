import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';

@Component({
    selector: 'app-virtual-player-dialog',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './virtual-player-dialog.component.html',
    styleUrl: './virtual-player-dialog.component.scss',
})
export class VirtualPlayerDialogComponent {
    virtualForm: FormGroup;

    constructor(
        private dialogRef: MatDialogRef<VirtualPlayerDialogComponent>,
        private formBuilder: FormBuilder,
        private roomManagerService: RoomManagerService,
    ) {
        this.virtualForm = this.formBuilder.group({
            behaviour: ['Agressive', Validators.required],
        });
    }

    selectBehaviour(behaviour: string): void {
        this.virtualForm.get('behaviour')?.setValue(behaviour);
    }

    onCreateClick(): void {
        const isAgressive = this.virtualForm.value.behaviour === 'Agressive';
        this.roomManagerService.addVirtualPlayer(isAgressive);
        this.dialogRef.close();
    }

    onCancelClick(): void {
        this.dialogRef.close();
    }

    setBehaviour(behaviour: string) {
        this.virtualForm.get('behaviour')?.setValue(behaviour);
    }
}
