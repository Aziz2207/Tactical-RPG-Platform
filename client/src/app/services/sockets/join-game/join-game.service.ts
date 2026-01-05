import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { SimpleDialogComponent } from "@app/components/simple-dialog/simple-dialog.component";
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { GameService } from "@app/services/sockets/game/game.service";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import { Avatar, Player } from "@common/interfaces/player";
import { Room, GameAvailability, GameStatus } from "@common/interfaces/room";
import { Game } from '@common/interfaces/game';
import { PathRoute } from "@common/interfaces/route";
import {
  ClientToServerEvent,
  ServerToClientEvent,
} from "@common/socket.events";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class JoinGameService {
  readonly errorMessagesConnection = new Map<string, string>([
    [
      "invalidFormat",
      this.translate.instant("JOIN_PAGE.ERRORS.INVALID_FORMAT"),
    ],
    ["roomNotFound", this.translate.instant("JOIN_PAGE.ERRORS.ROOM_NOT_FOUND")],
    ["roomFull", this.translate.instant("JOIN_PAGE.ERRORS.ROOM_FULL")],
    ["roomLocked", this.translate.instant("JOIN_PAGE.ERRORS.ROOM_LOCKED")],
    [
      "friendsOnlyAccess",
      this.translate.instant("JOIN_PAGE.ERRORS.FRIENDS_ONLY_ACCESS"),
    ],
    [
      "insufficientFunds",
      this.translate.instant("JOIN_PAGE.ERRORS.INSUFFICIENT_FUNDS"),
    ],
    [
      "blockedByUserInRoom",
      "Vous ne pouvez pas rejoindre cette partie car un joueur vous a bloqué",
    ],
        ['gameStarted', 'La partie a déjà commencé'],
        ['gameNotStarted', 'La partie n\'a pas encore commencé']
  ]);

  constructor(
    private socketCommunicationService: SocketCommunicationService,
    private dialog: MatDialog,
    private router: Router,
    private gameService: GameService,
    private translate: TranslateService,
    private gameCreationService: GameCreationService,
    private mapEditorService: MapEditorService
  ) {
    this.socketCommunicationService.on<{
      blockedUsers: string[];
      roomId: string;
    }>(ServerToClientEvent.BlockedByUserInRoom, (data) => {
      this.handleBlockedUsersWarning(data.blockedUsers, data.roomId);
    });

    this.socketCommunicationService.on(
      ServerToClientEvent.JoinError,
      (error: string) => {
        if (error === "insufficientFunds") {
          this.handleInsufficientFunds();
        }
      }
    );
  }

  async connect() {
    await this.socketCommunicationService.connect();
  }

  getErrorMessage(errorType?: string) {
    if (!errorType) {
      return;
    }
    return this.errorMessagesConnection.get(errorType);
  }

  onJoinGame(roomInfo: Room) {
    this.gameService.setRoomId(roomInfo.roomId);
    this.gameService.selectedGame = roomInfo.gameMap;
    this.gameService.gameAvailability =
      roomInfo.gameAvailability || GameAvailability.Public;
    this.gameService.isRoomDropInEnabled = roomInfo.dropInEnabled || false;
    this.gameService.isRoomQuickEliminationEnabled =
      roomInfo.quickEliminationEnabled || false;
    this.gameService.gameStatus = roomInfo.gameStatus || GameStatus.Lobby;
    this.gameService.entryFee = roomInfo.entryFee || 0;
  }

  joinLobby(player: Player) {
    this.socketCommunicationService.send(
      ClientToServerEvent.IsLocked,
      this.gameService.roomId
    );
    this.socketCommunicationService.once(
      ServerToClientEvent.IsRoomLocked,
      (isLocked: boolean) => {
        this.onIsRoomLocked(player, isLocked);
      }
    );
  }

    handleJoinGame(accessCode: string, isSpectator: boolean, callback: (roomInfo: Room | null, message: string) => void) {
        //clean listeners
        this.socketCommunicationService.off(ServerToClientEvent.JoinedRoom);
        this.socketCommunicationService.off(ServerToClientEvent.JoinError);
        
        this.socketCommunicationService.send(ClientToServerEvent.JoinRoom, { roomId: accessCode, isSpectator: isSpectator });
        this.socketCommunicationService.once<Room>(ServerToClientEvent.JoinedRoom, (roomInfo: Room) => {
            this.onJoinGame(roomInfo);
            callback(roomInfo, '');
        });
        this.socketCommunicationService.once(ServerToClientEvent.JoinError, (res: string) => {
            const errorMessage = this.getErrorMessage(res) ?? '';
            callback(null, errorMessage);
        });
    }

    handleJoinLobbyAsSpectator() {
        this.socketCommunicationService.once<Room>(
            ServerToClientEvent.ObtainRoomInfo, 
            (room: Room) => {
                this.loadMap(room.gameMap);
                this.router.navigate([PathRoute.GamePage], { 
                    queryParams: { roomCode: room.roomId, isSpectator: true } 
                });
            }
        );
        this.socketCommunicationService.send(ClientToServerEvent.GetRoom);
    }

    private loadMap(game: Game) {
        this.gameCreationService.isModifiable = false;
        this.mapEditorService.setMapToEdit(game);
        this.gameCreationService.setSelectedSize(this.gameCreationService.convertMapDimension(game));
        this.gameCreationService.isNewGame = false;
        this.gameCreationService.loadedTiles = game.tiles;
        this.gameCreationService.loadedObjects = game.itemPlacement;
        this.gameCreationService.loadedMapName = game.name;
    }

  private handleBlockedUsersWarning(blockedUsers: string[], roomId: string) {
    const count = blockedUsers.length;
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      disableClose: true,
      data: {
        title: "Utilisateur bloqué détecté",
        messages: [
          `Il y a ${count} joueur${
            count > 1 ? "s" : ""
          } que vous avez bloqué dans cette partie.`,
          "Voulez-vous quand même rejoindre cette partie ?",
        ],
        options: ["Annuler", "Rejoindre"],
        confirm: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result.action === "right") {
        this.socketCommunicationService.send(ClientToServerEvent.JoinRoom, {
          roomId: roomId,
          forceJoin: true,
        });
      }
    });
  }

  private handleInsufficientFunds() {
    this.dialog.open(SimpleDialogComponent, {
      disableClose: true,
      data: {
        title: "Montant insuffisant",
        messages: [
          "Vous n'avez pas assez d'argent pour rejoindre cette partie.",
        ],
        options: ["OK"],
        confirm: false,
      },
    });
  }

  onIsRoomLocked(player: Player, isLocked: boolean) {
    if (isLocked) {
      this.handleLockedRoom();
    } else {
      this.socketCommunicationService.send(
        ClientToServerEvent.CreatePlayer,
        player
      );
      if (this.gameService.gameStatus === GameStatus.Lobby)
        this.router.navigate([PathRoute.Lobby], {
          queryParams: { roomCode: this.gameService.roomId },
        });
      else {
        this.initGameServicesAndNavigateToGame();
      }
    }
  }

  initGameServicesAndNavigateToGame() {
    this.gameCreationService.isModifiable = false;
    this.mapEditorService.setMapToEdit(this.gameService.selectedGame);
    this.gameCreationService.setSelectedSize(
      this.gameCreationService.convertMapDimension(
        this.gameService.selectedGame
      )
    );
    this.gameCreationService.isNewGame = false;
    this.gameCreationService.loadedTiles = this.gameService.selectedGame.tiles;
    this.gameCreationService.loadedObjects =
      this.gameService.selectedGame.itemPlacement;
    this.gameCreationService.loadedMapName = this.gameService.selectedGame.name;
    this.router.navigate([PathRoute.GamePage], {
      queryParams: { roomCode: this.gameService.roomId },
    });
  }

  handleLockedRoom() {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      disableClose: true,
      data: {
        title: "Partie verrouillée",
        messages: [
          "Veuillez réessayer plus tard ou retourner au menu principal ",
        ],
        options: ["Quitter", "Rester"],
        confirm: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result.action === "left") {
        this.socketCommunicationService.send(
          ClientToServerEvent.LeaveRoom,
          this.gameService.roomId
        );
        this.router.navigate([PathRoute.Home]);
      }
    });
  }

  mergeAvatars(serverAvatars: Avatar[], userOwnedAvatars: Avatar[]): Avatar[] {
    const serverAvatarMap = new Map<string, Avatar>();
    serverAvatars.forEach((avatar) => {
      serverAvatarMap.set(avatar.src, avatar);
    });

    const mergedAvatars = userOwnedAvatars.map((userAvatar) => {
      const serverAvatar = serverAvatarMap.get(userAvatar.src);
      if (serverAvatar) {
        return {
          ...userAvatar,
          isSelected: serverAvatar.isSelected,
          isTaken: serverAvatar.isTaken,
        };
      }
      return userAvatar;
    });

    return mergedAvatars;
  }
}
