import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';
import { CONSTANTS } from '@common/constants';
import { CombatEvents } from '@common/event-enums/combat.gateway.events';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { GameSessionEvents } from '@common/event-enums/gameSession.gateway.events';
import { Attributes } from '@common/interfaces/attributes';
import { GlobalStats } from '@common/interfaces/global-stats';
import { Item } from '@common/interfaces/item';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { PlayerStats } from '@common/interfaces/player-stats';
import { Room } from '@common/interfaces/room';
import { ItemEnum } from '@common/item-enum';
import { ModeEnum } from '@common/mode-enum';
import { GameService } from './game.service';

describe('GameService', () => {
    let service: GameService;
    let mockRoomService: jasmine.SpyObj<RoomManagerService>;
    let mockSocketService: jasmine.SpyObj<SocketService>;

    // Mock data for testing
    const mockAttributes = { speedPoints: 4, lifePoints: 8, offensePoints: 8, defensePoints: 4 } as Attributes;
    const mockPlayer: Player = {
        isHost: true,
        socketId: '1234',
        userName: 'Player1',
        attributes: mockAttributes,
        characterType: 'logiciel',
        nbWins: 0,
        hasActed: false,
    } as unknown as Player;

    const mockMap: Map = {
        _tiles: [],
        _size: 10,
        _items: [],
        mode: ModeEnum.BR,
    };

    beforeEach(() => {
        // Mock dependencies
        mockRoomService = jasmine.createSpyObj('RoomManagerService', ['getRoom', 'leaveRoom'], {
            player: mockPlayer, // Ajout explicite pour mocker `player`
            room: { players: [mockPlayer], map: mockMap },
        });
        mockSocketService = jasmine.createSpyObj('SocketService', ['on', 'send']);

        TestBed.configureTestingModule({
            providers: [
                { provide: RoomManagerService, useValue: mockRoomService },
                { provide: SocketService, useValue: mockSocketService },
            ],
        });

        service = TestBed.inject(GameService);

        // Mock initial room and player state
        mockRoomService.getRoom.and.returnValue({
            players: [mockPlayer],
            map: mockMap,
        } as Room);

        service['gameState'] = {
            player: mockPlayer,
            activePlayer: undefined,
            nextPlayer: undefined,
            players: [mockPlayer],
            time: 0,
            yourTurn: false,
            map: mockMap,
            actionMode: false,
            debugMode: signal(false),
        };
    });

    // Basic creation test
    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should toggle debug mode', () => {
        service.toggleDebugMode();
        expect(mockSocketService.send).toHaveBeenCalledWith(GameLogicEvents.ToggleDebugMode);
    });

    it('should pass turn', () => {
        service.passTurn();
        expect(mockSocketService.send).toHaveBeenCalledWith(GameLogicEvents.PassTurn);
    });

    it('should toggle player flag status', () => {
        mockSocketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === GameLogicEvents.UpdateFlag) callback(mockPlayer as T);
        });

        service.enableGameListeners();
        expect(service['gameState'].players[0].hasFlag).toBeTrue();
    });

    it('should handle player inventory update', () => {
        const mockItem: Item = { itemType: ItemEnum.NanoBot } as Item;
        service['gameState'].player.inventory = [{ itemType: ItemEnum.NanoBot } as Item];

        mockSocketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === GameLogicEvents.UpdatePlayerInventory) callback(mockItem as T);
        });

        service.enableGameListeners();
        expect(service['gameState'].player.inventory).toContain(mockItem);
    });

    it('should leave the end view and notify server', () => {
        service.leaveEndView();
        expect(mockSocketService.send).toHaveBeenCalledWith('playerLeftEndGameView');
    });

    it('should handle clock listener and update time', () => {
        mockSocketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === GameLogicEvents.Clock) callback(30 as T);
        });

        service.enableGameListeners();
        expect(service['gameState'].time).toBe(30);
    });

    it('should handle turnStarted event correctly', () => {
        mockSocketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === GameLogicEvents.TurnStarted) callback(mockPlayer as T);
        });

        service.enableGameListeners();
        expect(service['gameState'].activePlayer).toEqual(mockPlayer);
        expect(service['gameState'].yourTurn).toBeTrue();
    });

    it('should remove player from game state and handle last player logic', () => {
        const mockOtherPlayer: Player = { ...mockPlayer, userName: 'Player2' };
        service['gameState'].players = [mockPlayer, mockOtherPlayer];
        const mockLastPlayerHandler = jasmine.createSpy('lastPlayerDialogHandler');

        service.setLastPlayerDialogHandler(mockLastPlayerHandler);
        service['removePlayer'](mockPlayer);

        expect(service['gameState'].players).toEqual([mockOtherPlayer]);
        expect(mockLastPlayerHandler).toHaveBeenCalled();
    });

    // Test for loading the game
    it('should load game state when room and map are defined', () => {
        service.loadGame();

        expect(service['gameState']).toBeDefined();
        expect(service['gameState'].map).toBe(mockMap);
        expect(service['gameState'].player).toEqual(mockPlayer);
        expect(service['gameState'].players).toEqual([mockPlayer]);
    });

    // Test for retrieving map size
    it('should return the game map size', () => {
        service.loadGame();
        expect(service.getSize()).toBe(10);
    });

    // Ensure listeners are only enabled once
    it('should enable listeners only once', () => {
        service.enableGameListeners();
        const initialCallCount = mockSocketService.on.calls.count();
        service.enableGameListeners();
        expect(mockSocketService.on.calls.count()).toEqual(initialCallCount);
    });

    // Test for handling clock events
    it('should handle clock event', () => {
        const clockCallback = jasmine.createSpy('clockCallback');
        mockSocketService.on.and.callFake((event, callback) => {
            if (event === GameLogicEvents.Clock) clockCallback.and.callFake(callback);
        });

        service.enableGameListeners();
        clockCallback(CONSTANTS.COMBAT_SECONDS_LENGTH);

        expect(service['gameState'].time).toBe(CONSTANTS.COMBAT_SECONDS_LENGTH);
    });

    // Test for handling turn start
    it('should handle turnStarted event', () => {
        const turnStartedCallback = jasmine.createSpy('turnStartedCallback');
        mockSocketService.on.and.callFake((event, callback) => {
            if (event === GameLogicEvents.TurnStarted) turnStartedCallback.and.callFake(callback);
        });

        service.enableGameListeners();
        turnStartedCallback(mockPlayer);

        expect(service['gameState'].activePlayer).toEqual(mockPlayer);
        expect(service['gameState'].yourTurn).toBeTrue();
    });

    // Test for handling turn end
    it('should handle turnEnded event', () => {
        const turnEndedCallback = jasmine.createSpy('turnEndedCallback');
        mockSocketService.on.and.callFake((event, callback) => {
            if (event === GameLogicEvents.TurnEnded) turnEndedCallback.and.callFake(callback);
        });

        service.enableGameListeners();
        turnEndedCallback(mockPlayer);

        expect(service['gameState'].activePlayer).toBeUndefined();
        expect(service['gameState'].yourTurn).toBeFalse();
    });

    // Test for handling map updates
    it('should handle updateMap event', () => {
        const updateMapCallback = jasmine.createSpy('updateMapCallback');
        const newMap = { ...mockMap, _size: 15 };
        mockSocketService.on.and.callFake((event, callback) => {
            if (event === GameLogicEvents.UpdateMap) updateMapCallback.and.callFake(callback);
        });

        service.enableGameListeners();
        updateMapCallback(newMap);

        expect(service['gameState'].map).toEqual(newMap);
    });

    // Test for handling players update
    it('should handle playersUpdate event', () => {
        const playersUpdateCallback = jasmine.createSpy('playersUpdateCallback');
        const updatedPlayers = [mockPlayer];
        mockSocketService.on.and.callFake((event, callback) => {
            if (event === GameSessionEvents.PlayersUpdate) playersUpdateCallback.and.callFake(callback);
        });

        service.enableGameListeners();
        playersUpdateCallback(updatedPlayers);

        expect(service.getPlayers()).toEqual(updatedPlayers);
    });

    it('should handle gameOver stats update', () => {
        const mockStats = {
            playerStats: [{ username: 'Player1', combats: 3 } as PlayerStats],
            globalStats: { totalTurns: 10 } as GlobalStats,
        };
        const gameOverSubjectSpy = spyOn(service.gameOverSubject, 'next');
        mockSocketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'gameOverStats') callback(mockStats as T);
        });
        service.enableGameListeners();
        expect(service.gameOverStats).toEqual(mockStats);
        expect(gameOverSubjectSpy).toHaveBeenCalled();
    });

    it('should handle inventory rejection and send updated inventory', () => {
        service['gameState'].player.inventory = [{ itemType: ItemEnum.ABomb } as Item, { itemType: ItemEnum.Battery } as Item];
        service.tempInventory.set([{ itemType: ItemEnum.ABomb } as Item]);

        service.handleInventory({ itemType: ItemEnum.Battery } as Item);

        expect(service.tempInventory()).toEqual([]);
        expect(mockSocketService.send).toHaveBeenCalledWith(GameLogicEvents.NewInventory, [{ itemType: ItemEnum.ABomb }]);
        expect(mockSocketService.send).toHaveBeenCalledWith(GameLogicEvents.RejectedItem, { itemType: ItemEnum.Battery });
    });

    it('should set inventory dialog handler', () => {
        const mockHandler = jasmine.createSpy('inventoryHandler');
        service.setInventoryDialogHandler(mockHandler);
        expect(service['inventoryHandler']).toBe(mockHandler);
    });

    it('should remove a player from gameState and call lastPlayerDialogHandler if only one player remains', () => {
        service['gameState'].players = [mockPlayer, { ...mockPlayer, userName: 'OtherPlayer' }];
        const lastPlayerHandler = jasmine.createSpy('lastPlayerDialogHandler');
        service.setLastPlayerDialogHandler(lastPlayerHandler);

        service['removePlayer'](mockPlayer);
        expect(service['gameState'].players.length).toBe(1);
        expect(lastPlayerHandler).toHaveBeenCalled();
    });

    it('should set game over handler', () => {
        const mockHandler = jasmine.createSpy('gameOverHandler');
        service.setGameOverHandler(mockHandler);
        expect(service['gameOverHandler']).toBe(mockHandler);
    });

    it('should set turn dialog handler', () => {
        const mockHandler = jasmine.createSpy('turnDialogHandler');
        service.setTurnDialogHandler(mockHandler);
        expect(service['turnDialogHandler']).toBe(mockHandler);
    });

    it('should set last player dialog handler', () => {
        const mockHandler = jasmine.createSpy('lastPlayerDialogHandler');
        service.setLastPlayerDialogHandler(mockHandler);
        expect(service['lastPlayerDialogHandler']).toBe(mockHandler);
    });

    it('should reset listeners and clear signals', () => {
        const mockSpeedCallback = jasmine.createSpy('speedCallback');
        mockSocketService.on.and.callFake((event, callback) => {
            if (event === GameSessionEvents.UpdatePlayerSpeed) mockSpeedCallback.and.callFake(callback);
        });

        service.resetListeners();
        expect(service['listenersEnabled']).toBeFalse();
        expect(service.getPlayers()).toEqual([]);
        mockSpeedCallback(5);
        expect(service['gameState'].activePlayer?.attributes.currentSpeed).toBeUndefined();
    });

    it('should remove all players and not call lastPlayerDialogHandler if no players remain', () => {
        const lastPlayerHandler = jasmine.createSpy('lastPlayerDialogHandler');
        service.setLastPlayerDialogHandler(lastPlayerHandler);

        service['gameState'].players = [mockPlayer];
        service['removePlayer'](mockPlayer);

        expect(service['gameState'].players).toEqual([]);
        expect(lastPlayerHandler).not.toHaveBeenCalled();
    });

    it('should handle UpdatePlayerInventory event by updating inventory and notifying handler', () => {
        const mockItem: Item = { itemType: ItemEnum.ABomb } as Item;
        const inventoryHandlerSpy = jasmine.createSpy('inventoryHandler');
        service.setInventoryDialogHandler(inventoryHandlerSpy);

        service['gameState'].yourTurn = true;
        service['gameState'].player.inventory = [{ itemType: ItemEnum.Battery } as Item, { itemType: ItemEnum.NanoBot } as Item];
        service.tempInventory.set([]);

        mockSocketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === GameLogicEvents.UpdatePlayerInventory) callback(mockItem as T);
        });

        service.enableGameListeners();

        expect(service.tempInventory()).toContain(mockItem);
        expect(inventoryHandlerSpy).toHaveBeenCalledWith(service.tempInventory());
    });

    it("should handle NewInventory event by clearing inventory when it is the player's turn", () => {
        service['gameState'].yourTurn = true;
        service['gameState'].player.inventory = [{ itemType: ItemEnum.Battery } as Item, { itemType: ItemEnum.NanoBot } as Item];

        mockSocketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === GameLogicEvents.NewInventory) callback(undefined as T);
        });

        service.enableGameListeners();

        expect(service['gameState'].player.inventory).toEqual([]);
    });

    it('should handle ToggleDebugMode event and update debug mode signal', () => {
        service['gameState'].debugMode.set(false);

        mockSocketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === GameLogicEvents.ToggleDebugMode) callback(true as T);
        });

        service.enableGameListeners();

        expect(service['gameState'].debugMode()).toBeTrue();
    });

    it('should increment nbWins of the correct player on CombatResult event', () => {
        const mockWinningPlayer: Player = { ...mockPlayer, userName: 'Player1', nbWins: 0 };
        const mockOtherPlayer: Player = { ...mockPlayer, userName: 'Player2', nbWins: 0 };
        service['gameState'].players = [mockWinningPlayer, mockOtherPlayer];

        // Simulate receiving the CombatResult event
        mockSocketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === CombatEvents.CombatResult) callback(mockWinningPlayer as T);
        });

        service.enableGameListeners();

        // Check that nbWins of the correct player has been incremented
        expect(mockWinningPlayer.nbWins).toBe(1);
        expect(mockOtherPlayer.nbWins).toBe(0);
    });
});
