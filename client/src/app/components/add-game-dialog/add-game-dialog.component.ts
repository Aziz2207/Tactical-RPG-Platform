import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AdminService } from '@app/services/admin/admin.service';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';

@Component({
    selector: 'app-add-game-dialog',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './add-game-dialog.component.html',
    styleUrl: './add-game-dialog.component.scss',
})
export class AddGameDialogComponent {
    adminForm: FormGroup;

    constructor(
        public dialogRef: MatDialogRef<AddGameDialogComponent>,
        private formBuilder: FormBuilder,
        private adminService: AdminService,
        private mapEditerService: MapEditorService,
        private router: Router,
    ) {
        this.adminForm = this.formBuilder.group({
            size: ['10', Validators.required],
            mode: ['Classique', Validators.required],
        });
    }

    selectOption(controlName: string, value: string): void {
        this.adminForm.get(controlName)?.setValue(value);
    }

    onNextClick(): void {
        if (this.adminForm.valid) {
            this.adminService.addGame(this.adminForm.value.size, this.adminForm.value.mode);
            this.mapEditerService.createGame(this.adminForm.value.size, this.adminForm.value.mode);
            this.dialogRef.close();
            this.router.navigate(['/edit']);
        }
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    setSize(size: string) {
        this.adminForm.get('size')?.setValue(size);
    }

    setMode(mode: string) {
        this.adminForm.get('mode')?.setValue(mode);
    }
}
