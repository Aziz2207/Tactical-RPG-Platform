import { Overlay } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NavigationStart, Router } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { InfoDialogComponent } from '@app/components/info-dialog/info-dialog.component';
import { PlayerListComponent } from '@app/components/player-list/player-list.component';
import { QuitDialogComponent } from '@app/components/quit-dialog/quit-dialog.component';
import { VirtualPlayerButtonComponent } from '@app/components/virtual-player-button/virtual-player-button.component';
import { WaitingRoomLoaderComponent } from '@app/components/waiting-room-loader/waiting-room-loader.component';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';
import { Player } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-main-page',
    standalone: true,
    templateUrl: './waiting-room.components.html',
    styleUrls: ['./waiting-room.components.scss'],
    imports: [
        CommonModule,
        HeaderComponent,
        WaitingRoomLoaderComponent,
        PlayerListComponent,
        ChatComponent,
        InfoDialogComponent,
        VirtualPlayerButtonComponent,
    ],
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
    players: Player[];
    accessCode: string;
    room: Room | undefined;
    isCurrentUserHost: boolean;

    private dialogRef: MatDialogRef<InfoDialogComponent>;
    private navigationSubscription: Subscription;

    constructor(
        private roomManagerService: RoomManagerService,
        private socketService: SocketService,
        private router: Router,
        private dialog: MatDialog,
        private overlay: Overlay,
    ) {}

    ngOnInit() {
        window.addEventListener('beforeunload', this.handleUnload);
        this.navigationSubscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationStart && !event.url.includes('/game')) {
                this.handleUnload();
            }
        });
        this.room = this.roomManagerService.getRoom();
        if (this.room) {
            this.accessCode = this.room.code;
            this.players = this.room.players;
            this.isCurrentUserHost = this.roomManagerService.player.isHost;
            this.socketService.on('hostLeft', this.handleHostLeft);
            this.socketService.on('removedFromRoom', this.handleRemovedFromRoom);
        } else {
            this.router.navigate(['/home']);
        }
    }
    ngOnDestroy() {
        window.removeEventListener('beforeunload', this.handleUnload);
        if (this.navigationSubscription) {
            this.navigationSubscription.unsubscribe();
        }
        this.socketService.off('hostLeft', this.handleHostLeft);
        this.socketService.off('removedFromRoom', this.handleRemovedFromRoom);
    }

    handleUnload = () => {
        this.roomManagerService.leaveRoom();
    };

    isRoomFull(): boolean | undefined {
        return this.room && this.room?.takenCharacters.length >= this.room?.maxPlayers;
    }

    isStartGameValid() {
        return this.room?.isLocked && this.room?.players.length >= 2;
    }

    toggleRoomLock() {
        this.roomManagerService.toogleRoomLock();
    }

    quitGame(): void {
        const dialogRef = this.dialog.open(QuitDialogComponent, {
            width: '600px',
            height: '200px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['quit-dialog-container'],
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result === 'yes') {
                this.roomManagerService.leaveRoom();
                this.router.navigate(['/home']);
            }
        });
    }

    startGame(): void {
        this.socketService.send<string>('initialiseGame', this.room?.code);
    }

    private handleHostLeft = () => {
        if (!this.dialogRef) {
            this.dialogRef = this.dialog.open(InfoDialogComponent, {
                data: { message: "L'hôte a quitté la salle d'attente" },
                width: '375px',
                height: '200px',
                scrollStrategy: this.overlay.scrollStrategies.noop(),
                panelClass: ['info-dialog-container'],
            });
        }
    };

    private handleRemovedFromRoom = () => {
        if (!this.dialogRef) {
            this.dialogRef = this.dialog.open(InfoDialogComponent, {
                data: { message: 'Vous avez été retiré par l’hôte.' },
                width: '375px',
                height: '200px',
                scrollStrategy: this.overlay.scrollStrategies.noop(),
                panelClass: ['info-dialog-container'],
            });
        }
    };
}
