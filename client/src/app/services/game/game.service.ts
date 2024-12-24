import { Injectable, signal, WritableSignal } from '@angular/core';
import { GameLogService } from '@app/services/game-log/game-log-service.service';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';
import { CombatEvents } from '@common/event-enums/combat.gateway.events';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { GameSessionEvents } from '@common/event-enums/gameSession.gateway.events';
import { Attributes } from '@common/interfaces/attributes';
import { GlobalStats } from '@common/interfaces/global-stats';
import { Item } from '@common/interfaces/item';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { PlayerStats } from '@common/interfaces/player-stats';
import { Position } from '@common/interfaces/position';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    gameState: GameState;
    tempInventory: WritableSignal<Item[]> = signal<Item[]>([]);
    gameOverStats: { playerStats: PlayerStats[]; globalStats: GlobalStats } | undefined;
    gameOverSubject = new Subject<void>();
    gameOver$ = this.gameOverSubject.asObservable();
    gameOverHandler: ((winner: Player) => void) | null = null;
    private loadSignal: WritableSignal<number> = signal<number>(-1);
    private turnDialogHandler: (playerName: string, type: string) => void;
    private lastPlayerDialogHandler: (() => void) | null = null;
    private listenersEnabled: boolean = false;
    private playersSignal: WritableSignal<Player[]> = signal<Player[]>([]);
    private inventoryHandler: (items: Item[]) => void;

    constructor(
        private roomService: RoomManagerService,
        private socketService: SocketService,
        private gameLogService: GameLogService,
    ) {}

    setInventoryDialogHandler(handler: (items: Item[]) => void): void {
        this.inventoryHandler = handler;
    }

    setGameOverHandler(handler: ((winner: Player) => void) | null): void {
        this.gameOverHandler = handler;
    }

    setTurnDialogHandler(handler: (playerName: string, type: string) => void): void {
        this.turnDialogHandler = handler;
    }

    setLastPlayerDialogHandler(handler: (() => void) | null): void {
        this.lastPlayerDialogHandler = handler;
    }

    quitGame() {
        this.roomService.leaveRoom();
        this.gameLogService.clearLogs();
    }

    isMyTurn(): boolean {
        return this.gameState.activePlayer ? this.gameState.activePlayer.userName === this.gameState.player.userName : false;
    }

    loadGame() {
        const room = this.roomService.getRoom();
        if (room && room.map) {
            this.gameState = {
                player: this.roomService.player,
                activePlayer: undefined,
                players: this.roomService.room.players,
                time: 0,
                yourTurn: false,
                nextPlayer: undefined,
                map: room.map,
                actionMode: false,
                debugMode: signal(false),
            };
            this.enableGameListeners();
            this.loadSignal.set(room.map._size);
        }
    }

    getSize(): number {
        return this.loadSignal.asReadonly()();
    }

    enableGameListeners(): void {
        if (this.listenersEnabled) return;

        this.listenersEnabled = true;

        this.registerClockListener();
        this.registerTurnListeners();
        this.registerMapListeners();
        this.registerPlayerListeners();
        this.registerCombatListeners();
        this.registerInventoryListeners();
        this.registerDebugModeListener();
        this.registerGameStatsListener();
    }

    resetListeners() {
        this.listenersEnabled = false;
        this.playersSignal.set([]);
        this.socketService.on<number>(GameSessionEvents.UpdatePlayerSpeed, (speed: number) => {
            if (this.gameState.activePlayer) {
                this.gameState.activePlayer.attributes.currentSpeed = speed;
            }
        });
    }

    handleInventory(rejectedItem: Item) {
        this.tempInventory.set(this.tempInventory().filter((item) => item !== rejectedItem));

        const inventory = this.gameState.player.inventory;
        if (inventory[0].itemType !== this.tempInventory()[0]?.itemType || inventory[1].itemType !== this.tempInventory()[1]?.itemType) {
            this.gameState.player.inventory = [...this.tempInventory()]; // Create new reference for player inventory
            this.socketService.send<Item[]>(GameLogicEvents.NewInventory, this.gameState.player.inventory);
        }

        this.tempInventory.set([]);
        this.socketService.send<Item>(GameLogicEvents.RejectedItem, rejectedItem);
    }

    passTurn(): void {
        this.socketService.send(GameLogicEvents.PassTurn);
    }

    getPlayers(): Player[] {
        return this.playersSignal.asReadonly()();
    }

    toggleDebugMode(): void {
        this.socketService.send(GameLogicEvents.ToggleDebugMode);
    }

    leaveEndView(): void {
        this.socketService.send('playerLeftEndGameView');
    }

    private registerClockListener(): void {
        this.socketService.on<number>(GameLogicEvents.Clock, (time: number) => {
            this.gameState.time = time;
        });
    }

    private registerTurnListeners(): void {
        this.socketService.on<Player>(GameLogicEvents.TurnStarted, (currentPlayer: Player) => {
            this.gameState.activePlayer = currentPlayer;
            this.gameState.yourTurn = currentPlayer.userName === this.gameState.player.userName;
            this.gameState.nextPlayer = undefined;
            this.gameState.actionMode = false;
            this.gameState.player.hasActed = false;

            if (this.turnDialogHandler) {
                this.turnDialogHandler(currentPlayer.userName, currentPlayer.characterType);
            }
        });

        this.socketService.on<Player>(GameLogicEvents.TurnEnded, (nextPlayer: Player) => {
            this.gameState.activePlayer = undefined;
            this.gameState.nextPlayer = nextPlayer;
            this.gameState.yourTurn = false;
            this.gameState.time = 0;
        });
    }

    private registerMapListeners(): void {
        this.socketService.on<Map>(GameLogicEvents.UpdateMap, (updatedMap: Map) => {
            this.gameState.map = updatedMap;
        });

        this.socketService.on<[number, number][]>(GameLogicEvents.AvailableTiles, (availableTiles) => {
            this.gameState.availableTiles = availableTiles;
        });

        this.socketService.on<Position>(GameLogicEvents.UpdatePlayerPos, (position: Position) => {
            if (this.gameState.activePlayer) {
                this.gameState.activePlayer.position = position;
            }
        });
    }

    private registerPlayerListeners(): void {
        this.socketService.on<Player>(GameSessionEvents.PlayerLeft, (player: Player) => {
            this.removePlayer(player);
        });

        this.socketService.on<Player[]>(GameSessionEvents.PlayersUpdate, (players: Player[]) => {
            this.gameState.players.splice(0, this.gameState.players.length, ...players);
            this.playersSignal.set(players);
        });

        this.socketService.on<Attributes>(GameSessionEvents.UpdateAttribute, (attributes: Attributes) => {
            if (this.gameState.yourTurn) {
                this.gameState.player.attributes = attributes;
            }
        });

        this.socketService.on<Player>(GameLogicEvents.GameOver, (winner: Player) => {
            if (this.gameOverHandler) {
                this.gameOverHandler(winner);
            }
        });

        this.socketService.on<void>(GameLogicEvents.GameAborted, () => {
            if (this.lastPlayerDialogHandler) {
                this.lastPlayerDialogHandler();
            }
        });
    }

    private registerCombatListeners(): void {
        this.socketService.on<Player>(CombatEvents.CombatResult, (player: Player) => {
            for (const p of this.gameState.players) {
                if (p.userName === player.userName) {
                    p.nbWins++;
                }
            }
        });
    }

    private registerInventoryListeners(): void {
        this.socketService.on<Item>(GameLogicEvents.UpdatePlayerInventory, (item: Item) => {
            if (this.gameState.yourTurn) {
                if (this.gameState.player.inventory.length >= 2) {
                    this.tempInventory.set(this.gameState.player.inventory);
                    this.tempInventory.set([...this.tempInventory(), item]);
                    this.inventoryHandler(this.tempInventory());
                } else {
                    this.gameState.player.inventory.push(item);
                    this.socketService.send<Item[]>(GameLogicEvents.NewInventory, this.gameState.player.inventory);
                }
            }
        });

        this.socketService.on<void>(GameLogicEvents.NewInventory, () => {
            if (this.gameState.yourTurn) {
                this.gameState.player.inventory = [];
            }
        });

        this.socketService.on<Player>(GameLogicEvents.UpdateFlag, (player: Player) => {
            const targetPlayer = this.gameState.players.find((p) => p.socketId === player.socketId);
            if (targetPlayer) targetPlayer.hasFlag = !targetPlayer.hasFlag;
        });
    }

    private registerDebugModeListener(): void {
        this.socketService.on<boolean>(GameLogicEvents.ToggleDebugMode, (debugMode: boolean) => {
            this.gameState.debugMode.set(debugMode);
        });
    }

    private removePlayer(player: Player): void {
        this.gameState.players = this.gameState.players.filter((p) => p.userName !== player.userName);
        if (this.gameState.players.length === 1 && this.lastPlayerDialogHandler) {
            this.lastPlayerDialogHandler();
        }
    }

    private registerGameStatsListener() {
        this.socketService.on<{ playerStats: PlayerStats[]; globalStats: GlobalStats }>('gameOverStats', (stats) => {
            this.gameOverStats = stats;
            this.gameOverSubject.next();
        });
    }
}

export interface GameState {
    player: Player;
    activePlayer: Player | undefined;
    nextPlayer: Player | undefined;
    players: Player[];
    time: number;
    yourTurn: boolean;
    availableTiles?: [number, number][];
    map: Map | undefined;
    actionMode?: boolean;
    debugMode: WritableSignal<boolean>;
}
