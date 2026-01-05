import { CommonModule } from "@angular/common";
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import { ChallengeCardComponent } from "@app/components/challenge-card/challenge-card.component";
import { CombatModalComponent } from "@app/components/combat-modal/combat-modal.component";
import { HeaderComponent } from "@app/components/header/header.component";
import { IngamePlayersSidebarComponent } from "@app/components/ingame-players-sidebar/ingame-players-sidebar.component";
import { GameGridComponent } from "@app/components/map-editor/game-grid/game-grid.component";
import { PlayerInfoInventoryComponent } from "@app/components/player-info-inventory/player-info-inventory.component";
import { TimerComponent } from "@app/components/timer/timer.component";
import { STARTING_TIME, TURN_TIME } from "@app/constants";
import { StartFightData } from "@app/interfaces/event-data";
import { GameCreationService } from "@app/services/game-creation/game-creation.service";
import { NavigationService } from "@app/services/navigation/navigation.service";
import { CombatService } from "@app/services/sockets/combat/combat.service";
import { GameService } from "@app/services/sockets/game/game.service";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import { ChallengeKey } from "@common/interfaces/challenges";
import { Player, Position } from "@common/interfaces/player";
import { Room } from "@common/interfaces/room";
import {
  ClientToServerEvent,
  ServerToClientEvent,
} from "@common/socket.events";
import { TranslateModule } from "@ngx-translate/core";
import { ChatBoxComponent } from "@app/components/chat-box/chat-box.component";

@Component({
  selector: "app-game-page",
  standalone: true,
  imports: [
    GameGridComponent,
    PlayerInfoInventoryComponent,
    IngamePlayersSidebarComponent,
    TimerComponent,
    CombatModalComponent,
    CommonModule,
    TranslateModule,
    HeaderComponent,
    ChallengeCardComponent,
    ChatBoxComponent
  ],
  templateUrl: "./game-page.component.html",
  styleUrl: "./game-page.component.scss",
})
export class GamePageComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() selectedSize: string | null = "small";
  @ViewChildren("pageElement") pageDiv: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChild("turnTimer") turnTimer!: TimerComponent;
  @ViewChild(HeaderComponent) headerComponent!: HeaderComponent;

  allPlayers: Player[] = [];
  mapName: string;
  mapDimensions: string;
  activePlayerName: string | null;
  activePlayer: Player;
  isActivePlayer: boolean = false;
  isInCombat: boolean = false;
  combatInProgress: boolean = false;
  isTurnStartShowed: boolean = false;
  timeRemainingBeforeStartTurn: number = STARTING_TIME;
  timeRemainingStartTurn: number = TURN_TIME;
  beforeTurnTotalTime: number = STARTING_TIME;
  turnTotalTime: number = TURN_TIME;
  doorAround: boolean = false;
  attackAround: boolean = false;
  private _isSpectator: boolean = false;
  private isCurrentCombatParticipant: boolean = false;

  private keyDownListener: (event: KeyboardEvent) => void;
  constructor(
    private gameCreationService: GameCreationService,
    private socketCommunicationService: SocketCommunicationService,
    private combatService: CombatService,
    private navigationService: NavigationService,
    private gameService: GameService
  ) {
    this.mapName = this.gameCreationService.loadedMapName;
    this.mapDimensions = this.findMapDimensions();
    this.combatService.isInCombat = false;
    this.combatService.isSpectator = this._isSpectator;
  }

  getUserId() {
    return this.gameService.getUserId();
  }

  getSocketId() {
    return this.socketCommunicationService.socket.id;
  }

  getCurrentPlayer() {
    return (
      this.gameService.getCurrentPlayer(this.allPlayers) ?? this.allPlayers[0]
    );
  }

  getTilesVisited(player: Player): number {
    const uniqueTiles = new Set(
      player.positionHistory.map((pos) => `${pos.x},${pos.y}`)
    ).size;
    return uniqueTiles;
  }

  getChallengeValue(player: Player): number {
    const challenge = player.assignedChallenge;
    const challengeKey = challenge?.key;

    let value = 0;

    switch (challengeKey) {
      case ChallengeKey.VisitedTiles:
        value = this.getTilesVisited(player);
        break;
      case ChallengeKey.Evasions:
        value = player.postGameStats.evasions;
        break;
      case ChallengeKey.Items:
        value = player.collectedItems?.length ?? 0;
        break;
      case ChallengeKey.Wins:
        value = player.postGameStats.victories;
        break;
      case ChallengeKey.DoorsInteracted:
        value = player.postGameStats.doorsInteracted;
        break;
      default:
        return 0;
    }

    return Math.min(value, challenge.goal);
  }

  get isChannelsBarOpen(): boolean {
    return this.headerComponent?.friendsBarOpen ?? false;
  }

  ngOnInit() {
    if (!this.mapDimensions || !this.mapName) {
      this.gameService.navigateToHome();
    }

        this.checkSpectatorStatus();

    this.socketCommunicationService.on<Room>(
      ServerToClientEvent.MapInformation,
      (room: Room) => {
        this.allPlayers = room.listPlayers;
        this.activePlayer = room.listPlayers.find((p) => p.isActive)!;
        this.gameService.isActionCombatSelected = false;
        this.gameService.isActionDoorSelected = false;
        // this.replenishHealth();
        // this.onBeforeStartTurn();
      }
    );

    this.initCombatListeners();
    this.initGameListeners();
    this.socketCommunicationService.send(ClientToServerEvent.GetRoom);
    }

    checkSpectatorStatus() {
        this.socketCommunicationService.send(ClientToServerEvent.GetSpectatorStatus);
        this.socketCommunicationService.once<boolean>(ServerToClientEvent.SpectatorStatus, (isSpectator: boolean) => {
            this._isSpectator = isSpectator;
            this.combatService.isSpectator = this._isSpectator;
        });
    }

    isSpectator(): boolean {
        return this._isSpectator;
  }

  initGameListeners() {
    this.gameService.addGamePageListeners();
    this.socketCommunicationService.on(
      ServerToClientEvent.PlayerDisconnected,
      (listPlayers: Player[]) => {
        this.allPlayers = listPlayers;
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.PlayerEliminated,
      (eliminatedPlayer: Player) => {
        if (eliminatedPlayer.uid === this.gameService.getUserId()) {
          this.combatService.isPlayerEliminated = true;
        }
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.UpdateAllPlayers,
      (listPlayers: Player[]) => {
        this.allPlayers = listPlayers;
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.OtherPlayerTurn,
      (name: string) => {
        this.activePlayerName = name;
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.DoorAround,
      (data: { doorAround: boolean; targets: Position[] }) => {
        this.doorAround = data.doorAround;
        this.gameService.doorsTarget = data.targets;
      }
    );

    this.socketCommunicationService.on(ServerToClientEvent.DoorClicked, () => {
      this.activePlayer.attributes.actionPoints -= 1;
    });

    this.socketCommunicationService.on(
      ServerToClientEvent.AttackAround,
      (data: { attackAround: boolean; targets: Player[] }) => {
        this.attackAround = data.attackAround;
        this.gameService.playersTarget = data.targets;
      }
    );
  }

  initCombatListeners() {
    this.socketCommunicationService.on(
      ServerToClientEvent.StartFight,
      (startFightData: StartFightData) => {
        this.combatService.isInCombat = true;
        this.isCurrentCombatParticipant = this.isPlayerInCombat(
          startFightData.combatPlayers
        );
        if (!this._isSpectator && this.isCurrentCombatParticipant) {
          this.activePlayer.attributes.actionPoints--;
        }
        this.gameService.isActionCombatSelected = false;
        this.combatService.initializeCombat(
          startFightData.combatPlayers,
          startFightData.isActivePlayerAttacker
        );
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.CombatInProgress,
      () => {
        this.combatInProgress = true;
      }
    );

    this.socketCommunicationService.on(ServerToClientEvent.CombatOver, () => {
      this.combatInProgress = false;
      this.isCurrentCombatParticipant = false;
    });

    this.socketCommunicationService.on(
      ServerToClientEvent.CombatEnd,
      (data: { listPlayers: Player[]; player: Player }) => {
        this.setPlayersOnCombatDone(data.listPlayers);
        this.navigationService.players = data.listPlayers;
        this.combatService.onCombatEnd(data.player);
        this.isCurrentCombatParticipant = false;
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.EvasionSuccess,
      (data: { listPlayers: Player[]; player: Player }) => {
        this.setPlayersOnCombatDone(data.listPlayers);
        this.combatService.onEvasion(data.player);
        this.isCurrentCombatParticipant = false;
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.DoorAround,
      (data: { doorAround: boolean; targets: Position[] }) => {
        this.doorAround = data.doorAround;
        this.gameService.doorsTarget = data.targets;
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.AttackAround,
      (data: { attackAround: boolean; targets: Player[] }) => {
        this.attackAround = data.attackAround;
        this.gameService.playersTarget = data.targets;
      }
    );
  }

  isActionDoorSelected() {
    return this.gameService.isActionDoorSelected;
  }

  isActionCombatSelected() {
    return this.gameService.isActionCombatSelected;
  }

  ngAfterViewInit() {
    this.socketCommunicationService.on(
      ServerToClientEvent.ActivePlayer,
      (activePlayer: Player) => {
        this.activePlayer = activePlayer;
        this.isActivePlayer = this.gameService.isCurrentPlayer(activePlayer);
        this.isTurnStartShowed = this.isActivePlayer;
      }
    );
    this.initTimerEvents();
  }

  initTimerEvents() {
    this.socketCommunicationService.on(
      ServerToClientEvent.BeforeStartTurnTimer,
      (timeRemaining: number) => {
        this.timeRemainingBeforeStartTurn = timeRemaining;
      }
    );
    this.socketCommunicationService.on(ServerToClientEvent.TurnEnded, () => {
      this.onBeforeStartTurn();
    });
    this.socketCommunicationService.on(
      ServerToClientEvent.UpdateVisual,
      (listPlayers: Player[]) => {
        this.allPlayers = listPlayers;
      }
    );
    this.socketCommunicationService.on(
      ServerToClientEvent.StartedTurnTimer,
      (timeRemaining: number) => {
        this.closeTurnStartPopUp();
        this.timeRemainingStartTurn = timeRemaining;
        this.turnTimer.updateProgress();
      }
    );
  }


  onBeforeStartTurn() {
        if (this._isSpectator) return;
    this.gameService.isActionCombatSelected = false;
    this.gameService.isActionDoorSelected = false;
    this.socketCommunicationService.send(ClientToServerEvent.StartTurn);
  }

  isDropInEnabled(): boolean {
    return this.gameService.isRoomDropInEnabled;
  }
  isQuickEliminationEnabled(): boolean {
    return this.gameService.isRoomQuickEliminationEnabled;
  }
  setPlayersOnCombatDone(players: Player[]) {
    this.allPlayers = players;
    // this.activePlayer.attributes.actionPoints -= 1;
  }

  getPlayerCount() {
    return this.allPlayers.length;
  }

  findMapDimensions(): string {
    const mapSize = this.gameCreationService.updateDimensions();
    return mapSize + " x " + mapSize;
  }

  replenishHealth() {
    this.allPlayers?.forEach((player) => {
      player.attributes.currentHp = player.attributes.totalHp;
    });
  }

  enableClicks() {
    if (this.pageDiv && this.pageDiv.length > 0) {
      this.pageDiv.first.nativeElement.id = "enabled";
    }
  }

  closeTurnStartPopUp() {
    this.isTurnStartShowed = false;
    this.beforeTurnTotalTime = STARTING_TIME;
    this.activePlayerName = null;
    this.enableClicks();
  }

  toggleActionDoorSelected() {
        if (this._isSpectator) return;
    this.gameService.toggleActionDoorSelected();
  }

  toggleActionCombatSelected() {
        if (this._isSpectator) return;
    this.gameService.toggleActionCombatSelected();
  }

  handleExit() {
    this.gameService.handleExit(this.allPlayers);
  }

  onEndTurn() {
        if (this._isSpectator) return;
    this.socketCommunicationService.send(ClientToServerEvent.EndTurn);
  }

  hasActionPoints() {
    return this.gameService.hasActionPoints(this.activePlayer);
  }

  isCombatStarted() {
    return this.combatService.isInCombat;
  }

  shouldDisplayCombatModal(): boolean {
    return (
      this.isCombatStarted() &&
      (this.isCurrentCombatParticipant ||
        this.isSpectator() ||
        this.combatService.isPlayerEliminated)
    );
  }

    isPlayerInCombat(combatPlayers: any): boolean {
        const currentPlayerUserId = this.getUserId();
        return (
          combatPlayers.attacker.uid === currentPlayerUserId ||
          combatPlayers.defender.uid === currentPlayerUserId
        );
    }

  ngOnDestroy() {
    document.removeEventListener("keydown", this.keyDownListener);
  }
}
