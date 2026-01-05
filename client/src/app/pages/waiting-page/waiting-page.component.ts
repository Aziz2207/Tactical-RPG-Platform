import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '@app/components/header/header.component';
import { LobbyPlayerComponent } from '@app/components/waiting-page/lobby-player/lobby-player.component';
import { CHALLENGES, DialogMessages, DialogOptions, DialogResult, DialogTitle, MIN_NUMBER_PLAYER } from '@app/constants';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { GameListService } from '@app/services/game-list/game-list.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { GameService } from '@app/services/sockets/game/game.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { Game } from '@common/interfaces/game';
import { Behavior, Player, Status } from '@common/interfaces/player';
import { GameAvailability, Room } from '@common/interfaces/room';
import { PathRoute } from '@common/interfaces/route';
import { ClientToServerEvent, ServerToClientEvent } from '@common/socket.events';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QRCodeModule } from 'angularx-qrcode';
import { LucideAngularModule, QrCode } from 'lucide-angular';
import { ChallengeCardComponent } from "@app/components/challenge-card/challenge-card.component";
import { ChatBoxComponent } from '@app/components/chat-box/chat-box.component';

@Component({
    selector: 'app-waiting-page',
    standalone: true,
    imports: [CommonModule, LobbyPlayerComponent, FormsModule, HeaderComponent, TranslateModule, QRCodeModule, LucideAngularModule, ChallengeCardComponent, ChatBoxComponent],
    templateUrl: './waiting-page.component.html',
    styleUrl: './waiting-page.component.scss',
})
export class WaitingPageComponent implements OnInit {
  @ViewChild(HeaderComponent) headerComponent!: HeaderComponent;

  accessCode: string;
  chosenGame: Game;
  isLocked: boolean = false;
  isDropInEnabled: boolean = false;
  isAdmin: boolean = false;
  players: Player[];
  isBotProfileVisible: boolean = false;
  isQrPopupVisible: boolean = false;
  status: Status;
  behavior: Behavior;
  entryFee: number;
  quickEliminationEnabled: boolean;
  readonly QrCode = QrCode;

  private router = inject(Router);
  public gameService = inject(GameService);

  get isFriendsOnly(): boolean {
    return this.gameService.gameAvailability === GameAvailability.FriendsOnly;
  }

  get isFriendsBarOpen(): boolean {
    return this.headerComponent?.friendsBarOpen ?? false;
  }

  constructor(
    private mapEditorService: MapEditorService,
    private gameCreationService: GameCreationService,
    private socketCommunicationService: SocketCommunicationService,
    private gameListService: GameListService,
    private translateService: TranslateService
  ) {
    this.gameListService.chosenGameSubject.subscribe((game: Game | null) => {
      if (game) {
        this.chosenGame = game;
      }
    });
    this.accessCode = this.gameService.roomId;
    this.chosenGame = this.gameService.selectedGame;
  }

    ngOnInit() {
        if (!this.accessCode || !this.chosenGame) {
            this.router.navigate([PathRoute.Home]);
        }
        this.initSocketListeners();
    }

    getSocketId() {
        return this.socketCommunicationService.socket.id;
    }

    getCurrentChallenge(){
        const currentPlayer = this.players?.find((player) => player.id === this.getSocketId())
        return currentPlayer?.assignedChallenge ?? CHALLENGES[3];
    }
    
  initSocketListeners() {
    this.gameService.handleRoomDeleted();
    this.gameService.handleLeftRoom();
    this.gameService.handleKickPlayer();
    this.socketCommunicationService.on(
      ServerToClientEvent.UpdatedPlayer,
      (room: Room) => {
        this.players = room.listPlayers;
        this.onMaxPlayers();
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.IsPlayerAdmin,
      (isPlayerAdmin: boolean) => {
        this.isAdmin = isPlayerAdmin;
      }
    );

    this.socketCommunicationService.on<Room>(
      ServerToClientEvent.StartGame,
      (room: Room) => {
        this.chosenGame = room.gameMap;
        this.loadMap();
        this.router.navigate([PathRoute.GamePage], {
          queryParams: { roomCode: this.accessCode },
        });
      }
    );
    this.socketCommunicationService.on(
      ServerToClientEvent.DropInEnableUpdated,
      (dropInEnabled: boolean) => {
        this.gameService.isRoomDropInEnabled = dropInEnabled;
        this.isDropInEnabled = dropInEnabled;
      }
    );
  }

  isMaxPlayersReached() {
    return (
      this.players?.length >=
      this.gameService.getPlayerNumber(this.chosenGame?.dimension)
    );
  }

  onMaxPlayers() {
    this.isLocked = this.isMaxPlayersReached();
    this.onLockChange();
  }

  onLockChange() {
    this.gameService.isRoomLocked = this.isLocked;
    this.socketCommunicationService.send(
      ClientToServerEvent.ChangeLockRoom,
      this.isLocked
    );
  }

  onDropInChange() {
    this.socketCommunicationService.send(
      ClientToServerEvent.ChangeDropInEnabled,
      this.isDropInEnabled
    );
  }

  handleExit(accessCode: string) {
    this.gameService.openPlayerQuitDialog(accessCode);
  }

  loadMap() {
    this.gameCreationService.isModifiable = false;
    this.mapEditorService.setMapToEdit(this.chosenGame);
    this.gameCreationService.setSelectedSize(
      this.gameCreationService.convertMapDimension(this.chosenGame)
    );
    this.gameCreationService.isNewGame = false;
    this.gameCreationService.loadedTiles = this.chosenGame.tiles;
    this.gameCreationService.loadedObjects = this.chosenGame.itemPlacement;
    this.gameCreationService.loadedMapName = this.chosenGame.name;
  }

  handleStartGame() {
    if (this.players.length < MIN_NUMBER_PLAYER) {
      this.gameService.openDialog({
        title: DialogTitle.StartGame,
        messages: [
          this.translateService.instant(DialogMessages.NotEnoughPlayers, {
            min: MIN_NUMBER_PLAYER,
          }),
        ],
        options: [DialogOptions.Close],
        confirm: false,
      });
      return;
    } else if (this.isLocked) {
      this.confirmStartGame();
    } else {
      this.gameService.openDialog({
        title: DialogTitle.StartGame,
        messages: [this.translateService.instant(DialogMessages.RoomLocked)],
        options: [DialogOptions.Close],
        confirm: false,
      });
    }
  }

  toggleBotProfileVisibility() {
    if (this.isLocked) {
      if (this.isMaxPlayersReached()) {
        this.gameService.openDialog({
          title: DialogTitle.MaxPlayers,
          messages: [this.translateService.instant(DialogMessages.MaxPlayers)],
          options: [DialogOptions.Close],
          confirm: false,
        });
      } else {
        this.gameService.openDialog({
          title: DialogTitle.AddBotWhenLocked,
          messages: [
            this.translateService.instant(DialogMessages.AddBotWhenLocked),
          ],
          options: [DialogOptions.Close],
          confirm: false,
        });
      }
      return;
    }
    this.isBotProfileVisible = !this.isBotProfileVisible;
  }

  toggleQrPopup() {
    this.isQrPopupVisible = !this.isQrPopupVisible;
  }
  addBot(isAgressive: boolean) {
    this.isBotProfileVisible = false;

    const behavior = isAgressive ? Behavior.Aggressive : Behavior.Defensive;
    this.socketCommunicationService.send(
      ClientToServerEvent.CreateBot,
      behavior
    );
  }

  private confirmStartGame() {
    this.gameService
      .openDialog({
        title: DialogTitle.StartGame,
        messages: [
          this.translateService.instant(DialogMessages.ConfirmStartGame),
        ],
        options: [DialogOptions.Cancel, DialogOptions.Confirm],
        confirm: true,
      })
      .subscribe((result) => {
        if (result.action === DialogResult.Right) {
          this.isLocked = true;
          this.socketCommunicationService.send(ClientToServerEvent.StartGame);
        }
      });
  }
}
