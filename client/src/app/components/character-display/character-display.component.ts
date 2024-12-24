import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Character } from '@app/classes/character';
import { AttributesComponent } from '@app/components/attributes/attributes.components';
import { ButtonComponent } from '@app/components/button/button.component';
import { LockedRoomDialogComponent } from '@app/components/locked-room-dialog/locked-room-dialog.component';
import { CharacterService } from '@app/services/character/character.service';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';
import { CONSTANTS } from '@common/constants';
import { Attributes } from '@common/interfaces/attributes';

@Component({
    selector: 'app-character-display',
    standalone: true,
    imports: [AttributesComponent, FormsModule, ButtonComponent],
    templateUrl: './character-display.component.html',
    styleUrl: './character-display.component.scss',
})
export class CharacterDisplayComponent implements OnInit, OnDestroy {
    selectedCharacter: Character | undefined;
    validAttributes = false;
    cantJoinMessage: string = '';
    userName: string;
    attributes: Attributes;
    maxName = CONSTANTS.MAX_NAME_LENGTH;
    gracefulExit: boolean = false;

    constructor(
        private characterService: CharacterService,
        private roomManagerService: RoomManagerService,
        private router: Router,
        private socketService: SocketService,
        private dialog: MatDialog,
    ) {}

    ngOnInit(): void {
        this.characterService.state$.subscribe((character) => {
            this.selectedCharacter = character;
        });
        if (this.socketService.isSocketAlive()) {
            this.socketService.on<string[]>('takenCharactersUpdate', (updatedTakenCharacters: string[]) => {
                if (this.selectedCharacter && updatedTakenCharacters.includes(this.selectedCharacter.type)) {
                    this.selectedCharacter = undefined;
                }
            });
        }
    }

    ngOnDestroy(): void {
        this.characterService.reset();
        if (!this.gracefulExit) {
            this.roomManagerService.leaveRoom();
        }
        this.gracefulExit = false;
    }

    validAttributesChanged(validAttributes: boolean): void {
        this.validAttributes = validAttributes;
        if (this.validAttributes) {
            this.cantJoinMessage = '';
        }
    }

    setAttributes(attr: Attributes) {
        this.attributes = attr;
    }

    canJoin() {
        return this.validAttributes && this.userName && this.userName.trim().length > 0; // no juste space username
    }

    setErrorMessage(): void {
        if (!this.validAttributes) {
            this.cantJoinMessage = 'Veuillez sélectionner un bonus et un dé avant de rejoindre la partie.';
        } else if (!this.userName) {
            this.cantJoinMessage = "Veuillez entrer un nom d'utilisateur.";
        } else if (!(this.userName.trim().length > 0)) {
            this.cantJoinMessage = "Nom d'utilisateur invalide.";
        } else if (!this.selectedCharacter) {
            this.cantJoinMessage = 'Veuillez choisir un avatar.';
        }
    }

    joinGame(): void {
        if (this.canJoin() && this.selectedCharacter) {
            const room = this.roomManagerService.getRoom();
            const player = this.roomManagerService.getPlayer();
            const isHost = player?.isHost ?? false;
            if (room?.isLocked && !isHost) {
                this.dialog.open(LockedRoomDialogComponent, {
                    width: '600px',
                    height: '260px',
                    panelClass: ['locked-dialog-container'],
                });
            } else {
                this.selectedCharacter.isTaken = true;
                if (player) {
                    this.gracefulExit = true;
                    this.roomManagerService.sendPlayerInfos(this.userName, this.selectedCharacter.type, this.attributes, player.nbWins, []);
                    this.router.navigate(['/wait']);
                }
            }
        } else {
            this.setErrorMessage();
        }
    }

    notifyRoomLocked(): void {
        const roomLockedEvent = new CustomEvent('roomLocked', { bubbles: true });
        window.dispatchEvent(roomLockedEvent);
    }
}
