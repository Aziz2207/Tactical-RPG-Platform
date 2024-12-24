import { Overlay } from '@angular/cdk/overlay';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CharacterCarousselComponent } from '@app/components/character-caroussel/character-caroussel.component';
import { CharacterDisplayComponent } from '@app/components/character-display/character-display.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { InfoDialogComponent } from '@app/components/info-dialog/info-dialog.component';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';

@Component({
    selector: 'app-create-character',
    standalone: true,
    imports: [HeaderComponent, CharacterCarousselComponent, CharacterDisplayComponent, InfoDialogComponent],
    templateUrl: './create-character.component.html',
    styleUrl: './create-character.component.scss',
})
export class CreateCharacterComponent implements OnInit, OnDestroy {
    private dialogRefInfo: MatDialogRef<InfoDialogComponent>;

    constructor(
        private roomManagerService: RoomManagerService,
        private socketService: SocketService,
        private router: Router,
        private dialog: MatDialog,
        private overlay: Overlay,
    ) {}

    ngOnInit(): void {
        window.addEventListener('beforeunload', this.handleUnload);

        if (this.roomManagerService.room) {
            this.socketService.on('hostLeft', this.handleHostLeft);
            this.socketService.on('removedFromRoom', this.handleRemovedFromRoom);
        } else {
            this.router.navigate(['/home']);
        }
    }

    ngOnDestroy(): void {
        this.socketService.off('hostLeft', this.handleHostLeft);
        this.socketService.off('removedFromRoom', this.handleRemovedFromRoom);
    }

    handleUnload = () => {
        this.roomManagerService.leaveRoom();
        this.router.navigate(['/home']);
    };

    handleHostLeft = () => {
        if (!this.dialogRefInfo) {
            this.dialogRefInfo = this.dialog.open(InfoDialogComponent, {
                data: { message: "L'hôte a quitté la salle d'attente" },
                width: '375px',
                height: '200px',
                scrollStrategy: this.overlay.scrollStrategies.noop(),
                panelClass: ['info-dialog-container'],
            });
        }
    };

    handleRemovedFromRoom = () => {
        if (!this.dialogRefInfo) {
            this.dialogRefInfo = this.dialog.open(InfoDialogComponent, {
                data: { message: 'Vous avez été retiré par l’hôte.' },
                width: '375px',
                height: '200px',
                scrollStrategy: this.overlay.scrollStrategies.noop(),
                panelClass: ['info-dialog-container'],
            });
        }
    };
}
