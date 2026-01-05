import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { CharacterCreatorComponent } from '@app/components/character-creator/character-creator.component';
import { GameListComponent } from '@app/components/game-list/game-list.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { MESSAGE_DURATION_CHARACTER_FORM } from '@app/constants';
import { GameListService } from '@app/services/game-list/game-list.service';
import { GameService } from '@app/services/sockets/game/game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { AvatarsPurchaseService } from '@app/services/user-account/avatars-purchase/avatars-purchase.service';
import { Game } from '@common/interfaces/game';
import { Player, Avatar } from '@common/interfaces/player';
import { Room, GameAvailability } from '@common/interfaces/room';
import { PathRoute } from '@common/interfaces/route';
import { ClientToServerEvent, ServerToClientEvent } from '@common/socket.events';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: "app-create-game-page",
  standalone: true,
  imports: [
    GameListComponent,
    RouterLink,
    CharacterCreatorComponent,
    CommonModule,
    HeaderComponent,
    TranslateModule,
  ],
  templateUrl: "./create-game-page.component.html",
  styleUrls: [
    "../../../common/css/game-list-page.scss",
    "./create-game-page.component.scss",
  ],
})
export class CreateGamePageComponent implements OnInit, OnDestroy {
  isCharacterFormVisible: boolean = false;
  selectedGame: Game | null = null;
  roomCode: string;
  gameName: string;
  availableAvatars: Avatar[] = [];
  selectedAvailability: GameAvailability = GameAvailability.Public;
  entryFee: number = 0;
  quickEliminationEnabled: boolean= false;
  private subscription: Subscription = new Subscription();

  constructor(
    private gameListService: GameListService,
    private snackBar: MatSnackBar,
    private socketCommunicationService: SocketCommunicationService,
    private gameService: GameService,
    private router: Router,
    private avatarsPurchaseService: AvatarsPurchaseService,
    private translate: TranslateService
  ) {
    this.subscription.add(
      this.gameListService.selectedGameSubject.subscribe(
        (game: Game | null) => {
          this.selectedGame = game;
        }
      )
    );
  }

  async ngOnInit(): Promise<void> {
    this.availableAvatars = await this.avatarsPurchaseService.loadAvatars();
  }

  showCharacterForm() {
    if (!this.selectedGame) {
      this.snackBar.open(
        this.translate.instant("GAME_CREATION.SELECT_BEFORE_CREATING_GAME"),
        this.translate.instant("DIALOG.CLOSE"),
        {
          duration: MESSAGE_DURATION_CHARACTER_FORM,
        }
      );
      return;
    }
    this.gameListService
      .checkIfVisibleGameExists(this.selectedGame)
      .subscribe((game: Game | null) => {
        if (game) {
          this.isCharacterFormVisible = true;
          this.gameListService.chosenGameSubject.next(game);
          this.socketCommunicationService.connect();
        } else {
          this.snackBar.open(
            this.translate.instant("GAME_CREATION.HIDDEN_GAME"),
            this.translate.instant("DIALOG.CLOSE"),
            {
              duration: MESSAGE_DURATION_CHARACTER_FORM,
            }
          );
        }
      });
  }

  joinLobby(event: {
    player: Player;
    availability: GameAvailability;
    entryFee: number;
    quickEliminationEnabled: boolean;
  }) {
    this.selectedAvailability = event.availability;
    this.entryFee = event.entryFee;
    this.quickEliminationEnabled = event.quickEliminationEnabled;
    this.createRoom();
    this.socketCommunicationService.send(
      ClientToServerEvent.CreatePlayer,
      event.player
    );
  }

  hideCharacterForm() {
    this.isCharacterFormVisible = false;
    this.socketCommunicationService.disconnect();
    this.socketCommunicationService.connect();
  }

  createRoom() {
    const roomData = {
      game: this.selectedGame,
      gameAvailability: this.selectedAvailability,
      quickEliminationEnabled: this.quickEliminationEnabled,
      entryFee: this.entryFee,
    };

    this.socketCommunicationService.send(
      ClientToServerEvent.CreateRoom,
      roomData
    );
    this.socketCommunicationService.on(
      ServerToClientEvent.RoomCreated,
      (roomInfo: Room) => {
        this.gameService.selectedGame = roomInfo.gameMap;
        this.roomCode = roomInfo.roomId;
        this.gameService.setRoomId(this.roomCode);
        this.gameService.joinRoom(this.roomCode);
        this.router.navigate([PathRoute.Lobby], {
          queryParams: { roomCode: this.roomCode },
        });
      }
    );
  }

  ngOnDestroy() {
    this.gameListService.selectedGameSubject.next(null);
    this.subscription.unsubscribe();
  }
}   