import { Overlay } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AddGameDialogComponent } from '@app/components/add-game-dialog/add-game-dialog.component';

@Component({
    selector: 'app-admin-button',
    standalone: true,
    imports: [MatDialogModule],
    templateUrl: './add-game-btn.component.html',
    styleUrl: './add-game-btn.component.scss',
})
export class AddGameButtonComponent {
    constructor(
        public dialog: MatDialog,
        private router: Router,
        private overlay: Overlay,
    ) {}

    openDialog() {
        const dialogRef = this.dialog.open(AddGameDialogComponent, {
            width: '750px',
            height: '500px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['add-dialog-container'],
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.router.navigate(['/add']);
            }
        });
    }
}
