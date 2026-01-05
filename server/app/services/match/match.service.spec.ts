import { SPAWN_POINT_ID } from '@app/constants';
import { mockGame } from '@app/mocks/mock-game';
import { mockPlayers } from '@app/mocks/mock-players';
import { mockRooms } from '@app/mocks/mock-room';
import { RoomService } from '@app/services/room/room.service';
import { Position } from '@common/interfaces/player';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { MatchService } from './match.service';

describe('MatchService', () => {
    let service: MatchService;
    let roomService: RoomService;
    let mockSocket: Socket;
    let expectedSpawnPoints: Position[];

    beforeEach(async () => {
        const roomServiceMock = {
            getRoom: jest.fn(),
            rooms: new Map(),
        };

        expectedSpawnPoints = [
            { x: 0, y: 1 },
            { x: 1, y: 3 },
            { x: 2, y: 1 },
            { x: 3, y: 3 },
        ];

        mockSocket = {
            emit: jest.fn(),
            data: { roomCode: '1234' },
            id: 'admin1234',
            rooms: new Set(['1234']),
            to: jest.fn().mockReturnThis(),
        } as unknown as Socket;

        const module: TestingModule = await Test.createTestingModule({
            providers: [MatchService, { provide: RoomService, useValue: roomServiceMock }],
        }).compile();

        service = module.get<MatchService>(MatchService);
        roomService = module.get<RoomService>(RoomService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should assign spawn point to player', () => {
        const room = mockRooms[0];
        room.listPlayers = mockPlayers;

        (roomService.getRoom as jest.Mock).mockReturnValue(mockRooms[0]);
        service['getSpawnPoints'] = jest.fn().mockReturnValue(expectedSpawnPoints);
        service['assignPlayersToSpawnPoints'] = jest.fn();

        service.processMapObjects(mockSocket);
        expect(service['game']).toBe(mockGame);
        expect(roomService.getRoom).toHaveBeenCalled();
        expect(service['getSpawnPoints']).toHaveBeenCalled();
        expect(service['assignPlayersToSpawnPoints']).toHaveBeenCalled();
    });

    it('should return array of spawn point', () => {
        const mapObjects = [
            [0, SPAWN_POINT_ID, 0, 0],
            [0, 2, 0, SPAWN_POINT_ID],
            [0, SPAWN_POINT_ID, 1, 0],
            [1, 0, 0, SPAWN_POINT_ID],
        ];
        const spawnPoints = service['getSpawnPoints'](mapObjects);
        expect(spawnPoints).toEqual(expectedSpawnPoints);
    });

    it('should assign player to spawn point', () => {
        service['getRandomIndex'] = jest.fn().mockImplementation((length) => {
            return length - 1;
        });

        service['assignPlayersToSpawnPoints'](mockPlayers, expectedSpawnPoints);
        expect(mockPlayers[0].position).toEqual({ x: 3, y: 3 });
        expect(mockPlayers[1].position).toEqual({ x: 2, y: 1 });
    });

    it('should return a random index within the specified range', () => {
        const max = 10;
        const value = 0.5;
        const expectedValue = 5;
        jest.spyOn(Math, 'random').mockReturnValue(value);

        const result = service['getRandomIndex'](max);
        expect(result).toBe(expectedValue);
    });
});
