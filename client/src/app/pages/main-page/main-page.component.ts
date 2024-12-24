import { Overlay } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { JoinGameDialogComponent } from '@app/components/join-game-dialog/join-game-dialog.component';

@Component({
    selector: 'app-main-page',
    standalone: true,
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink],
})
export class MainPageComponent {
    constructor(
        private router: Router,
        private overlay: Overlay,
        public dialog: MatDialog,
    ) {}

    goToJoin() {
        this.dialog.open(JoinGameDialogComponent, {
            width: '450px',
            height: '300px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['join-dialog-container'],
        });
    }

    goToAdmin() {
        this.router.navigate(['/admin']);
    }
    goToCreate() {
        this.router.navigate(['/start']);
    }
}
