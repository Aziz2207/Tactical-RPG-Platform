import { Overlay } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { JoinGameDialogComponent } from '@app/components/join-game-dialog/join-game-dialog.component';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
})
export class HeaderComponent {
    constructor(
        public dialog: MatDialog,
        private overlay: Overlay,
    ) {}

    preventDrag(event: Event) {
        event.preventDefault();
    }

    openJoinGameDialog(): void {
        this.dialog.open(JoinGameDialogComponent, {
            width: '400px',
            height: '260px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['join-dialog-container'],
        });
    }
}
