import { Overlay } from '@angular/cdk/overlay';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { VirtualPlayerDialogComponent } from '@app/components/virtual-player-dialog/virtual-player-dialog.component';

@Component({
    selector: 'app-virtual-player-button',
    standalone: true,
    imports: [MatDialogModule, MatButtonModule],
    templateUrl: './virtual-player-button.component.html',
    styleUrl: './virtual-player-button.component.scss',
})
export class VirtualPlayerButtonComponent {
    @Input() isRoomFull: boolean | undefined = false;
    constructor(
        public dialog: MatDialog,
        private overlay: Overlay,
    ) {}

    openDialog() {
        this.dialog.open(VirtualPlayerDialogComponent, {
            width: '550px',
            height: '350px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['virtual-dialog-container'],
        });
    }
}
