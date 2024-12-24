import { GameInfoService } from '@app/services/game-info/game-info.service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { Item } from '@common/interfaces/item';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { ItemEnum } from '@common/item-enum';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { ActiveSessionService } from './active-session.service';

describe('ActiveSessionService', () => {
    let service: ActiveSessionService;
    let gameTimerService: jest.Mocked<GameTimerService>;
    let gameInfoService: jest.Mocked<GameInfoService>;
    let server: jest.Mocked<Server>;
    let mockRoom: Room;

    beforeEach(async () => {
        gameTimerService = {
            createTimer: jest.fn(),
        } as unknown as jest.Mocked<GameTimerService>;

        gameInfoService = {
            initialisePlayerStats: jest.fn(),
        } as unknown as jest.Mocked<GameInfoService>;

        server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActiveSessionService,
                { provide: GameTimerService, useValue: gameTimerService },
                { provide: GameInfoService, useValue: gameInfoService },
            ],
        }).compile();

        service = module.get<ActiveSessionService>(ActiveSessionService);

        mockRoom = {
            code: 'room1',
            players: [
                { socketId: 'player1', attributes: { speedPoints: 5 }, position: {x: 0, y: 0} } as Player,
                { socketId: 'player2', attributes: { speedPoints: 10 }, position: {x: 0, y: 0} } as Player,
            ],
        } as Room;
    });

    describe('initialiseGame', () => {
        it('should initialise a new game session', () => {
            const result = service.initialiseGame(mockRoom, server);

            expect(result).toBeDefined();
            expect(service.activeSessions.has(mockRoom.code)).toBe(true);
            expect(server.to).toHaveBeenCalledWith(mockRoom.code);
            expect(server.emit).toHaveBeenCalledWith(expect.any(String));
        });

        it('should return existing session if already initialised', () => {
            const session1 = service.initialiseGame(mockRoom, server);
            const session2 = service.initialiseGame(mockRoom, server);

            expect(session1).toBe(session2);
        });
    });

    describe('endSession', () => {
        it('should remove an active session and deactivate the room', () => {
            const session = service.initialiseGame(mockRoom, server);
            service.endSession(session);

            expect(service.activeSessions.has(mockRoom.code)).toBe(false);
            expect(mockRoom.isActive).toBe(false);
        });
    });

    describe('getCurrentPlayerId', () => {
        it('should return the current player ID for a session', () => {
            const session = service.initialiseGame(mockRoom, server);
            session.turnIndex = 0;

            const result = service.getCurrentPlayerId(mockRoom.code);

            expect(result).toBe('player2');
        });

        it('should return an empty string if the session does not exist', () => {
            const result = service.getCurrentPlayerId('nonexistentRoom');
            expect(result).toBe('');
        });
    });

    describe('addRejectedItem', () => {
        it('should add a rejected item to the map and emit updates', () => {
            const session = service.initialiseGame(mockRoom, server);
            const player = session.room.players[0];
            player.position = { x: 0, y: 0 };

            const map = {
                _tiles: [[{}]]
            } as unknown as Map
            session.room.map = map;

            const item= { itemType: ItemEnum.Flag } as Item;

            service.addRejectedItem('player1', session, item);

            expect(map._tiles[0][0].item).toBe(item);
            expect(server.to).toHaveBeenCalledWith(mockRoom.code);
            expect(server.emit).toHaveBeenCalledWith(expect.any(String), map);
        });
    });

    describe('orderPlayersBySpeed', () => {
        it('should order players by speed in descending order', () => {
            const session = service.initialiseGame(mockRoom, server);

            service['orderPlayersBySpeed'](session);

            expect(session.room.players[0].socketId).toBe('player2');
            expect(session.room.players[1].socketId).toBe('player1');
        });

        it('should use a random value for tie-breaking', () => {
            mockRoom.players[0].attributes.speedPoints = 10;

            const session = service.initialiseGame(mockRoom, server);

            service['orderPlayersBySpeed'](session);

            expect(session.room.players[0].socketId).toBeDefined();
        });
    });
});
