import { ActiveSession } from "@app/interfaces/active-session";
import { GameLogicEvents } from "@common/event-enums/gameLogic.gateway.events";
import { CombatMove } from "@common/interfaces/combat";
import { Player } from "@common/interfaces/player";
import { Position } from "@common/interfaces/position";
import { Server, Socket } from 'socket.io';
import { ActionsService } from "../actions/actions.service";
import { CombatService } from "../combat/combat-service.service";
import { PlayerMovementService } from "../player-movement/player-movement.service";
import { TileValidityService } from "../tile-validity/tile-validity.service";
import { GameControllerService } from "./game-controller.service";

describe('GameControllerService', () => {
    let service: GameControllerService;
    let playerMovementService: jest.Mocked<PlayerMovementService>;
    let tileValidityService: jest.Mocked<TileValidityService>;
    let combatService: jest.Mocked<CombatService>;
    let inventoryService: jest.Mocked<ActionsService>;
    let mockServer: jest.Mocked<Server>;
    let mockSession: ActiveSession;
    let mockPlayer: Player;

    beforeEach(async () => {
        playerMovementService = {
            loadCharacters: jest.fn(),
            movePlayer: jest.fn(),
            teleportPlayerDebug: jest.fn(),
        } as unknown as jest.Mocked<PlayerMovementService>;

        tileValidityService = {
            getReachableTiles: jest.fn(),
        } as unknown as jest.Mocked<TileValidityService>;

        combatService = {
            combatMove: jest.fn(),
            beginCombat: jest.fn(),
            leaveRoom: jest.fn(),
        } as unknown as jest.Mocked<CombatService>;

        inventoryService = {
            updatePlayer: jest.fn(),
            handleCombatEnd: jest.fn(),
            toggleDoor: jest.fn(),
        } as unknown as jest.Mocked<ActionsService>;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        mockPlayer = {
            socketId: 'player1',
            userName: 'Player1',
            position: { x: 0, y: 0 },
            attributes: {
                speedPoints: 4,
                currentSpeed: 4,
                lifePoints: 4,
                offensePoints: 4,
                defensePoints: 4,
                diceChoice: 'attack',
                currentHP: 4,
                actionLeft: 1,
            },
        } as Player;

        mockSession = {
            room: {
                code: 'room1',
                players: [mockPlayer],
                map: {
                    _tiles: [[]],
                },
            },
            turnIndex: 0,
            debugMode: false,
        } as ActiveSession;

        service = new GameControllerService(
            playerMovementService,
            tileValidityService,
            combatService,
            inventoryService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('initialiseGame', () => {
        it('should load characters and emit TurnEnded event', () => {
            service.initialiseGame(mockSession, mockServer);

            expect(playerMovementService.loadCharacters).toHaveBeenCalledWith(mockServer, mockSession);
            expect(mockServer.to).toHaveBeenCalledWith(mockSession.room.code);
            expect(mockServer.emit).toHaveBeenCalledWith(GameLogicEvents.TurnEnded, mockSession.room.players[0]);
        });
    });

    describe('toggleDebugMode', () => {
        it('should toggle debug mode and emit events', () => {
            tileValidityService.getReachableTiles.mockReturnValue([[1, 1]]);
    
            service.toggleDebugMode(mockSession, mockServer);
    
            expect(mockSession.debugMode).toBe(true);
            expect(tileValidityService.getReachableTiles).toHaveBeenCalledWith(
                mockSession.room.map,
                mockSession.room.players[mockSession.turnIndex],
            );
            expect(mockServer.to).toHaveBeenCalledWith(mockSession.room.code);
            expect(mockServer.emit).toHaveBeenCalledWith('availableTiles', [[1, 1]]);
            expect(mockServer.emit).toHaveBeenCalledWith(GameLogicEvents.ToggleDebugMode, true);
        });

        it('should toggle debug mode off and emit events', () => {
            mockSession.debugMode = true;
            tileValidityService.getReachableTiles.mockReturnValue([[1, 1]]);
    
            service.toggleDebugMode(mockSession, mockServer);
    
            expect(mockSession.debugMode).toBe(false);
            expect(mockServer.to).toHaveBeenCalledWith(mockSession.room.code);
            expect(mockServer.emit).toHaveBeenCalledWith(GameLogicEvents.ToggleDebugMode, false);
        });
    });

    describe('teleportPlayerDebug', () => {
        it('should call playerMovementService.teleportPlayerDebug with correct arguments', () => {
            const mockSocket = {
                id: 'socket1',
            } as unknown as jest.Mocked<Socket>;
            const position: Position = { x: 2, y: 3 };

            service.teleportPlayerDebug(mockSocket, mockSession, position, mockServer);

            expect(playerMovementService.teleportPlayerDebug).toHaveBeenCalledWith(
                mockSocket.id,
                mockSession,
                position,
                mockServer,
            );
        });
    });

    describe('combatMove', () => {
        it('should call combatService.combatMove with correct arguments', () => {
            const move = { attacker: 'player1', defender: 'player2', action: 'attack' } as unknown as CombatMove;

            service.combatMove(mockSession, mockServer, move);

            expect(combatService.combatMove).toHaveBeenCalledWith(mockSession, mockServer, move);
        });
    });

    describe('movePlayer', () => {
        it('should call playerMovementService to move player', () => {
            const path: [number, number][] = [[0, 0], [1, 1]];
            const socket = { id: 'socket1' } as Socket;

            service.movePlayer(socket, mockSession, path, mockServer);

            expect(path).toEqual([[1, 1]]);
            expect(playerMovementService.movePlayer).toHaveBeenCalledWith(socket.id, mockSession, [[1, 1]], mockServer);
        });
    });

    // describe('combatMove', () => {
    //     it('should call combatService for combat move', () => {
    //         const move: CombatMove = { attacker: 'Player1', defender: 'Player2' } as CombatMove;

    //         service.combatMove(mockSession, mockServer, move);

    //         expect(combatService.combatMove).toHaveBeenCalledWith(mockSession, mockServer, move);
    //     });
    // });

    describe('startCombat', () => {
        it('should call combatService to begin combat', () => {
            const victimUser = 'Player2';
            const socket = { id: 'socket1' } as Socket;

            service.startCombat(mockSession, socket, victimUser, mockServer);

            expect(combatService.beginCombat).toHaveBeenCalledWith(mockSession, socket.id, victimUser, mockServer);
        });
    });

    describe('toggleDoor', () => {
        it('should call actionsService to toggle a door', () => {
            const position: Position = { x: 1, y: 1 };
            const socket = { id: 'socket1' } as Socket;

            service.toggleDoor(mockSession, socket, position, mockServer);

            expect(inventoryService.toggleDoor).toHaveBeenCalledWith(socket.id, mockSession, position, mockServer);
        });
    });

    // describe('updateInventory', () => {
    //     it('should call inventoryService to update player inventory', () => {
    //         const inventory: Item[] = [{ itemType: ItemEnum.ABomb }] as Item[];
    //         const socket = { id: 'socket1' } as Socket;

    //         service.updateInventory(mockSession, socket, inventory, mockServer);

    //         expect(inventoryService.updatePlayerAttributes).toHaveBeenCalledWith(socket.id, mockSession, inventory, mockServer);
    //     });
    // });

    describe('handleDisconnectionCombat', () => {
        it('should call combatService to handle player disconnection from combat', () => {
            service.handleDisconnectionCombat(mockSession, mockPlayer, mockServer);

            expect(combatService.leaveRoom).toHaveBeenCalledWith(mockPlayer, mockSession, mockServer);
        });
    });

    describe('handleDisconnectionInventory', () => {
        it('should call inventoryService to handle player disconnection from inventory', () => {
            service.handleDisconnectionInventory(mockSession, mockPlayer, mockServer);

            expect(inventoryService.handleCombatEnd).toHaveBeenCalledWith(mockPlayer, mockSession, mockServer);
        });
    });
});
