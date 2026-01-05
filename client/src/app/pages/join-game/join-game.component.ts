import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CharacterCreatorComponent } from '@app/components/character-creator/character-creator.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { GameService } from '@app/services/sockets/game/game.service';
import { JoinGameService } from '@app/services/sockets/join-game/join-game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { AvatarsPurchaseService } from '@app/services/user-account/avatars-purchase/avatars-purchase.service';
import { Game } from '@common/interfaces/game';
import { Avatar, Player } from '@common/interfaces/player';
import { Room, GameAvailability } from '@common/interfaces/room';
import { ClientToServerEvent, ServerToClientEvent } from '@common/socket.events';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: "app-join-game",
  standalone: true,
  imports: [
    FormsModule,
    CharacterCreatorComponent,
    RouterLink,
    HeaderComponent,
    TranslateModule,
  ],
  templateUrl: "./join-game.component.html",
  styleUrl: "./join-game.component.scss",
})
export class JoinGameComponent implements OnInit {
    accessCode: string;
    isCharacterFormVisible: boolean = false;
    errorMessage: string = '';
    submitForm: boolean = false;
    availableAvatars: Avatar[] = [];
    userOwnedAvatars: Avatar[] = [];
    roomEntryFee: number = 0;
    selectedGame: Game | null = null;

    constructor(
        private socketCommunicationService: SocketCommunicationService,
        private joinGameService: JoinGameService,
        private avatarsPurchaseService: AvatarsPurchaseService,
        private gameService: GameService
    ) {
        this.joinGameService.connect();
        this.socketCommunicationService.on(ServerToClientEvent.CharacterSelected, (serverAvatars: Avatar[]) => {
            this.availableAvatars = this.joinGameService.mergeAvatars(serverAvatars, this.userOwnedAvatars);
        });

        this.selectedGame = this.gameService.selectedGame;
    }

  async ngOnInit(): Promise<void> {
    this.userOwnedAvatars = await this.avatarsPurchaseService.loadAvatars();
    this.availableAvatars = this.userOwnedAvatars;
  }

    joinGame(accessCode: string, isSpectator: boolean = false) {
        this.submitForm = true;
        this.errorMessage = '';
        this.joinGameService.handleJoinGame(accessCode, isSpectator, (roomInfo: Room | null, message: string) => {
            if (roomInfo) {
                if (isSpectator) {
                    this.joinGameService.handleJoinLobbyAsSpectator();
                } else {
                    this.isCharacterFormVisible = true;
                    this.roomEntryFee = roomInfo.entryFee ?? 0;
                    this.availableAvatars = this.joinGameService.mergeAvatars(roomInfo.availableAvatars, this.userOwnedAvatars);
                }
            } else {
                this.errorMessage = message;
            }
        });
    }

  joinLobby(event: { player: Player; availability: GameAvailability }) {
    this.joinGameService.joinLobby(event.player);
  }

  selectedAvatar(avatar: Avatar) {
    this.socketCommunicationService.send(
      ClientToServerEvent.SelectCharacter,
      avatar
    );
  }

  leaveGame(roomCode: string) {
    this.isCharacterFormVisible = false;
    this.socketCommunicationService.send(
      ClientToServerEvent.LeaveRoom,
      roomCode
    );
    this.accessCode = "";
  }
}
