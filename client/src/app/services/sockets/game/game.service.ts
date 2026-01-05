import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { SimpleDialogComponent } from "@app/components/simple-dialog/simple-dialog.component";
import { TemporaryDialogComponent } from "@app/components/temporary-dialog/temporary-dialog.component";
import {
  DialogMessages,
  DialogOptions,
  DialogResult,
  DialogTitle,
  MAX_PLAYER_LARGE_MAP,
  MAX_PLAYER_MEDIUM_MAP,
  MAX_PLAYER_SMALL_MAP,
  SIZE_LARGE_MAP,
  SIZE_MEDIUM_MAP,
  SIZE_SMALL_MAP,
} from "@app/constants";
import { DialogData } from "@app/interfaces/dialog-data";
import { TempDialogData } from "@app/interfaces/temp-dialog-data";
import { NavigationService } from "@app/services/navigation/navigation.service";
import { PostGameService } from "@app/services/post-game/post-game.service";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { ObjectType } from "@common/avatars-info";
import { Game } from "@common/interfaces/game";
import { GameObject } from "@common/interfaces/game-object";
import { GridOperationsInfo } from "@common/interfaces/grid-operations-info";
import { ItemSwap } from "@common/interfaces/item-swap";
import { Player, Position, Status } from "@common/interfaces/player";
import { GameAvailability, GameStatus, Room } from "@common/interfaces/room";
import { PathRoute } from "@common/interfaces/route";
import { gameObjects } from "@common/objects-info";
import {
  ClientToServerEvent,
  ServerToClientEvent,
} from "@common/socket.events";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class GameService {
  roomId: string;
  isRoomLocked: boolean;
  isJoined: boolean = false;
  selectedGame: Game;
  isActionDoorSelected: boolean = false;
  isActionCombatSelected: boolean = false;
  playersTarget: Player[];
  doorsTarget: Position[];
  gameAvailability: GameAvailability;
  entryFee: number;
  isRoomDropInEnabled: boolean;
  isRoomQuickEliminationEnabled: boolean;
  gameStatus: GameStatus;

  constructor(
    private socketCommunicationService: SocketCommunicationService,
    private dialog: MatDialog,
    private router: Router,
    private postGameService: PostGameService,
    private navigationService: NavigationService,
    private translateService: TranslateService,
    private userAccountService: UserAccountService
  ) {}

  getUserId():string {
    return this.userAccountService.accountDetails().uid;
  }
  setRoomId(room: string) {
    this.roomId = room;
  }

  joinRoom(roomCode: string) {
    this.socketCommunicationService.send(
      ClientToServerEvent.JoinRoom,
      roomCode
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.JoinedRoom,
      (roomInfo: Room) => {
        // console.log("Room Info: " + roomInfo.gameAvailability);
        this.isJoined = true;
        this.roomId = roomInfo.roomId;
        this.selectedGame = roomInfo.gameMap;
        this.gameAvailability =
          roomInfo.gameAvailability || GameAvailability.Public;
        this.entryFee = roomInfo.entryFee || 0;
        this.gameAvailability =
          roomInfo.gameAvailability || GameAvailability.Public;
        this.isRoomDropInEnabled = roomInfo.dropInEnabled || false;
        this.isRoomQuickEliminationEnabled =
          roomInfo.quickEliminationEnabled || false;
        this.gameStatus = roomInfo.gameStatus;
      }
    );
  }

  canOpenDoor(player: Player) {
    return this.isActionDoorSelected && this.hasActionPoints(player);
  }

  canStartCombat(player: Player) {
    return this.isActionCombatSelected && this.hasActionPoints(player);
  }

  handleTileClick(position: Position, activePlayer: Player, tiles: number[][]) {
    if (this.canOpenDoor(activePlayer)) {
      this.socketCommunicationService.send(ClientToServerEvent.DoorAction, {
        clickedPosition: position,
        player: activePlayer,
      });
      return false;
    } else if (this.canStartCombat(activePlayer)) {
      this.socketCommunicationService.send(ClientToServerEvent.CombatAction, {
        clickedPosition: position,
        player: activePlayer,
      });
      return false;
    } else if (
      !this.navigationService.isInteractionPossible(
        { row: position.x, col: position.y },
        tiles,
        activePlayer
      )
    ) {
      return true;
    }
    return false;
  }

  handleFightAction({ position, objects }: GridOperationsInfo, player: Player) {
    if (
      this.navigationService.isNeighbor(position, player) &&
      !this.navigationService.isObject(position)
    ) {
      player.attributes.actionPoints--;
      this.isActionCombatSelected = false;
      const player2 = this.getPlayerByAvatarName(
        this.navigationService.players,
        objects[position.x][position.y]
      );
      const [attacker, defender] =
        player2 && player.attributes.speed < player2.attributes.speed
          ? [player2, player]
          : [player, player2];
      const isActivePlayerAttacker = player.uid === attacker.uid;
      this.socketCommunicationService.send(ClientToServerEvent.StartFight, {
        player1: attacker,
        player2: defender,
        isPlayer1Active: isActivePlayerAttacker,
      });
      return player;
    }
    return player;
  }

  getPlayerByAvatarName(players: Player[], id: ObjectType) {
    const avatarName = gameObjects.find((obj) => obj.id === id)?.name;
    const clickedPlayer = players.find(
      (player) => player.avatar?.name === avatarName
    );
    return clickedPlayer;
  }

  getPlayerNumber(height: number): number {
    switch (height) {
      case SIZE_SMALL_MAP:
        return MAX_PLAYER_SMALL_MAP;
      case SIZE_MEDIUM_MAP:
        return MAX_PLAYER_MEDIUM_MAP;
      case SIZE_LARGE_MAP:
        return MAX_PLAYER_LARGE_MAP;
      default:
        throw new Error("Nombre de joueur invalide");
    }
  }

  openDialog(dialogData: DialogData) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      disableClose: true,
      data: dialogData,
    });
    return dialogRef.afterClosed();
  }

  openTempDialog(dialogData: TempDialogData) {
    const dialogRef = this.dialog.open(TemporaryDialogComponent, {
      disableClose: true,
      data: dialogData,
    });
    return dialogRef.afterClosed();
  }

  openAdminQuitDialog(message: string) {
    this.openDialog({
      title: DialogTitle.GameCanceled,
      messages: [message],
      confirm: false,
      options: [DialogOptions.Close],
    }).subscribe(() => {
      this.navigateToHome();
    });
  }


  handleEndGame() {
      this.socketCommunicationService.once(ServerToClientEvent.EndGame, (data: { winner: Player; room: Room }) => {
          this.removeGamePageListeners();
          this.postGameService.transferRoomStats(data.room);
          this.openDialog({
              title: DialogTitle.EndGame,
              messages: [this.translateService.instant('DIALOG.MESSAGE.WINNER_ANNOUNCED', {
                  winner: data.winner?.name || 'Unknown',
              })],
              options: [DialogOptions.Close],
              confirm: false,
              image: data.winner?.avatar?.src,
          }).subscribe((result) => {
              if (result.action === DialogResult.Close) {
                  this.router.navigate([PathRoute.PostGame], { queryParams: { roomCode: data.room.roomId } });
              }
          });
        });
    }

  handleRoomDeleted() {
    this.socketCommunicationService.off(ServerToClientEvent.RoomDeleted);
    this.socketCommunicationService.once(
      ServerToClientEvent.RoomDeleted,
      (message: string) => {
        this.openAdminQuitDialog(this.translateService.instant(message));
      }
    );
  }

  handleKickPlayer() {
    this.socketCommunicationService.once(ServerToClientEvent.KickPlayer, () => {
      this.openPlayerKickoutDialog();
    });
  }

  openPlayerQuitDialog(roomId: string) {
    this.openDialog({
      title: DialogTitle.QuitGame,
      messages: [this.translateService.instant(DialogMessages.QuitGame)],
      options: [DialogOptions.Quit, DialogOptions.Stay],
      confirm: true,
    }).subscribe((result) => {
      if (result.action === DialogResult.Left) {
        this.socketCommunicationService.send(
          ClientToServerEvent.LeaveRoom,
          roomId
        );
      }
    });
  }

  openQuitPostGameLobby(roomId: string) {
    this.openDialog({
      title: DialogTitle.QuitPostGameLobby,
      messages: [
        this.translateService.instant(DialogMessages.QuitPostGameLobby),
      ],
      options: [DialogOptions.Quit, DialogOptions.Stay],
      confirm: true,
    }).subscribe((result) => {
      if (result.action === DialogResult.Left) {
        this.navigateToHome();
        this.socketCommunicationService.send(
          ClientToServerEvent.LeaveRoom,
          roomId
        );
      }
    });
  }

  openPlayerKickoutDialog() {
    this.openDialog({
      title: DialogTitle.KickedOut,
      messages: [this.translateService.instant(DialogMessages.KickedOut)],
      options: [DialogOptions.Close],
      confirm: false,
    }).subscribe((result) => {
      if (result.action === DialogResult.Close) {
        this.navigateToHome();
      }
    });
  }

  handleLeftRoom() {
    this.socketCommunicationService.on(
      ServerToClientEvent.LeftRoom,
      (isAdmin) => {
        if (isAdmin) {
          this.router.navigate([PathRoute.CreateGame]);
        } else {
          this.navigateToHome();
        }
      }
    );
  }

  handleOpenItemSwitchModal() {
    this.socketCommunicationService.on(
      ServerToClientEvent.OpenItemSwitchModal,
      (data: { activePlayer: Player; foundItem: number }) => {
        const itemObject = gameObjects.find(
          (items) => items.id === data.foundItem
        );
        if (!itemObject) return;
        this.openSwitchItemDialog(data.activePlayer, itemObject);
      }
    );
  }

  handleExit(players: Player[]) {
    this.openDialog({
      title: DialogTitle.QuitGame,
      messages: [this.translateService.instant(DialogMessages.QuitGame)],
      options: [DialogOptions.Quit, DialogOptions.Stay],
      confirm: true,
    }).subscribe((result) => {
      if (result.action === DialogResult.Left) {
        this.socketCommunicationService.disconnect();
        this.socketCommunicationService.connect();
        this.navigateToHome();
      }
    });
  }

  hasActionPoints(player: Player) {
    return player?.attributes.actionPoints > 0;
  }

  isActionSelected() {
    return this.isActionDoorSelected || this.isActionCombatSelected;
  }

  isTarget(row: number, col: number) {
    return this.isTargetDoor(row, col) || this.isTargetPlayer(row, col);
  }

  isTargetDoor(row: number, col: number) {
    return this.isActionDoorSelected
      ? this.doorsTarget.some((tile) => tile.x === row && tile.y === col)
      : false;
  }

  isTargetPlayer(row: number, col: number) {
    return this.isActionCombatSelected
      ? this.playersTarget.some(
          (tile) => tile.position.x === row && tile.position.y === col
        )
      : false;
  }

  isCurrentPlayer(player: Player) {
    return player.uid === this.userAccountService.accountDetails().uid;
  }

  getCurrentPlayer(players: Player[]) {
    return players.find((player) => this.isCurrentPlayer(player));
  }

  isCurrentPlayerAdmin(players: Player[]): boolean {
    const admin = players.find((player) => player.status === Status.Admin);
    const currentPlayer = this.getCurrentPlayer(players);
    return !!(currentPlayer && admin && currentPlayer.uid === admin.uid);
  }

    removeGamePageListeners() {
        this.socketCommunicationService.off(ServerToClientEvent.ActivePlayer);
        this.socketCommunicationService.off(ServerToClientEvent.AttackAround);
        this.socketCommunicationService.off(ServerToClientEvent.BeforeStartTurnTimer);
        this.socketCommunicationService.off(ServerToClientEvent.CombatEnd);
        this.socketCommunicationService.off(ServerToClientEvent.DebugMode);
        this.socketCommunicationService.off(ServerToClientEvent.DoorAround);
        this.socketCommunicationService.off(ServerToClientEvent.DoorClicked);
        this.socketCommunicationService.off(ServerToClientEvent.EndGame);
        this.socketCommunicationService.off(ServerToClientEvent.EvasionSuccess);
        this.socketCommunicationService.off(ServerToClientEvent.OpenItemSwitchModal);
        this.socketCommunicationService.off(ServerToClientEvent.StartedTurnTimer);
        this.socketCommunicationService.off(ServerToClientEvent.StartFight);
        this.socketCommunicationService.off(ServerToClientEvent.TurnEnded);
        this.socketCommunicationService.off(ServerToClientEvent.RoomDeleted);
    }

    addGamePageListeners() {
        this.handleEndGame();
        this.handleOpenItemSwitchModal();
    }

  toggleActionDoorSelected() {
    this.isActionDoorSelected = !this.isActionDoorSelected;
    this.isActionCombatSelected = false;
  }

  toggleActionCombatSelected() {
    this.isActionCombatSelected = !this.isActionCombatSelected;
    this.isActionDoorSelected = false;
  }

  navigateToHome() {
    this.router.navigate([PathRoute.Home]);
  }

  private openSwitchItemDialog(activePlayer: Player, foundItem: GameObject) {
    const oldInventory = JSON.parse(JSON.stringify(activePlayer.inventory));
    const itemSwap: ItemSwap = {
      currentItem1: activePlayer.inventory[0],
      currentItem2: activePlayer.inventory[1],
      pickedUpItem: foundItem,
    };
    this.openDialog({
      title: DialogTitle.ItemExchange,
      messages: [
        `Quel objet voulez échanger pour celui-ci : ${this.translateService.instant(foundItem?.name)}`
      ],
            options: [],
      confirm: false,
      itemSwap,
    }).subscribe(() => {
      this.socketCommunicationService.send(ClientToServerEvent.ItemSwapped, {
        inventoryToUndo: oldInventory,
        newInventory: activePlayer.inventory,
        droppedItem: itemSwap.pickedUpItem.id,
      });
    });
  }
}
