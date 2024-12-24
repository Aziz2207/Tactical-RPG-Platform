import { ActiveSession } from '@app/interfaces/active-session';
import { ActiveSessionService } from '@app/services/active-session/active-session.service';
import { GameControllerService } from '@app/services/game-controller/game-controller.service';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { RoomService } from '@app/services/rooms/rooms.service';
import { TurnService } from '@app/services/turn/turn.service';
import { CombatMove } from '@common/interfaces/combat';
import { Position } from '@common/interfaces/position';
import { Room } from '@common/interfaces/room';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { GameLogicGateway } from './game-logic.gateway';

describe('GameLogicGateway', () => {
    let gateway: GameLogicGateway;
    let mockRoomService: jest.Mocked<RoomService>;
    let mockActiveSessionService: jest.Mocked<ActiveSessionService>;
    let mockInfoService: jest.Mocked<GameInfoService>;
    let mockTurnService: jest.Mocked<TurnService>;
    let mockGameControllerService: jest.Mocked<GameControllerService>;
    let mockServer: jest.Mocked<Server>;
    let mockSocket: jest.Mocked<Socket>;

    beforeEach(async () => {
        mockRoomService = {
            getRoom: jest.fn(),
            getRoomCodeBySocketId: jest.fn(),
        } as unknown as jest.Mocked<RoomService>;

        mockActiveSessionService = {
            initialiseGame: jest.fn(),
            activeSessions: new Map(),
            addRejectedItem: jest.fn(),
            getCurrentPlayerId: jest.fn(),
        } as unknown as jest.Mocked<ActiveSessionService>;

        mockInfoService = {
            getLogs: jest.fn(),
        } as unknown as jest.Mocked<GameInfoService>;

        mockTurnService = {
            startNextTurn: jest.fn(),
            pauseTurn: jest.fn(),
            continueTurn: jest.fn(),
            endTurn: jest.fn(),
        } as unknown as jest.Mocked<TurnService>;

        mockGameControllerService = {
            initialiseGame: jest.fn(),
            movePlayer: jest.fn(),
            toggleDebugMode: jest.fn(),
            startCombat: jest.fn(),
            combatMove: jest.fn(),
            toggleDoor: jest.fn(),
            updateInventory: jest.fn(),
            teleportPlayerDebug: jest.fn(),
        } as unknown as jest.Mocked<GameControllerService>;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        mockSocket = {
            id: 'socket1',
            emit: jest.fn(),
        } as unknown as jest.Mocked<Socket>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameLogicGateway,
                { provide: RoomService, useValue: mockRoomService },
                { provide: ActiveSessionService, useValue: mockActiveSessionService },
                { provide: GameInfoService, useValue: mockInfoService },
                { provide: TurnService, useValue: mockTurnService },
                { provide: GameControllerService, useValue: mockGameControllerService },
            ],
        }).compile();

        gateway = module.get<GameLogicGateway>(GameLogicGateway);
        gateway['server'] = mockServer;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('initialiseGame', () => {
        it('should initialize the game and start the first turn', () => {
            const mockRoom = { code: 'room1', isActive: false } as unknown as Room;
            mockRoomService.getRoom.mockReturnValue(mockRoom as any);
            mockActiveSessionService.initialiseGame.mockReturnValue({ room: mockRoom } as unknown as ActiveSession);

            gateway.initialiseGame(mockSocket, 'room1');

            expect(mockRoomService.getRoom).toHaveBeenCalledWith('room1');
            expect(mockActiveSessionService.initialiseGame).toHaveBeenCalledWith(mockRoom, mockServer);
            expect(mockGameControllerService.initialiseGame).toHaveBeenCalledWith(expect.anything(), mockServer);
        });
    });

    describe('startGame', () => {
        it('should start the next turn if a session exists', () => {
            const mockSession = { room: { code: 'room1' } } as unknown as ActiveSession;
            mockActiveSessionService.activeSessions.set('room1', mockSession);

            gateway.startGame(mockSocket, 'room1');

            expect(mockTurnService.startNextTurn).toHaveBeenCalledWith(mockSession, mockServer);
        });
    });

    describe('pauseGame', () => {
        it('should pause the turn if the session exists', () => {
            const mockSession = { room: { code: 'room1' } } as unknown as ActiveSession;
            mockActiveSessionService.activeSessions.set('room1', mockSession);

            gateway.pauseGame(mockSocket, 'room1');

            expect(mockTurnService.pauseTurn).toHaveBeenCalledWith(mockSession);
        });
    });

    describe('movePlayer', () => {
        it('should move the player if session and path are valid', () => {
            const path: [number, number][] = [[1, 1], [2, 2]];
            const mockSession = { room: { code: 'room1', isActive: true } } as unknown as ActiveSession;
            mockRoomService.getRoomCodeBySocketId.mockReturnValue('room1');
            mockActiveSessionService.activeSessions.set('room1', mockSession);

            gateway.movePlayer(mockSocket, path);

            expect(mockGameControllerService.movePlayer).toHaveBeenCalledWith(mockSocket, mockSession, path, mockServer);
        });
    });

    describe('teleportPlayer', () => {
        it('should teleport the player to the specified position', () => {
            const position: Position = { x: 1, y: 1 };
            const mockSession = { room: { code: 'room1', isActive: true } } as unknown as ActiveSession;
            mockRoomService.getRoomCodeBySocketId.mockReturnValue('room1');
            mockActiveSessionService.activeSessions.set('room1', mockSession);

            gateway.teleportPlayer(mockSocket, position);

            expect(mockGameControllerService.teleportPlayerDebug).toHaveBeenCalledWith(mockSocket, mockSession, position, mockServer);
        });
    });

    describe('combatMove', () => {
        it('should handle combat moves', () => {
            const move = { attacker: 'player1', defender: 'player2', action: 'attack' } as unknown as CombatMove;
            const mockSession = { room: { code: 'room1', isActive: true } } as unknown as ActiveSession;
            mockRoomService.getRoomCodeBySocketId.mockReturnValue('room1');
            mockActiveSessionService.activeSessions.set('room1', mockSession);

            gateway.combatMove(mockSocket, move);

            expect(mockGameControllerService.combatMove).toHaveBeenCalledWith(mockSession, mockServer, move);
        });
    });
});
