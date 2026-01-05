import { Timer } from '@app/classes/timer/timer';
import { ACCESS_CODE_LENGTH } from '@app/constants';
import { defaultGlobalStats } from '@app/mocks/default-global-stats';
import { mockGame } from '@app/mocks/mock-game';
import { mockRooms } from '@app/mocks/mock-room';
import { mockServer } from '@app/mocks/mock-server';
import { ChatService } from '@app/services/chat/chat.service';
import { avatars } from '@common/avatars-info';
import { GameStatus } from '@common/interfaces/room';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { RoomService } from './room.service';

describe('RoomService', () => {
    let service: RoomService;
    let mockSocket: Socket;
    let roomId: string;
    let chatService: ChatService;

    beforeEach(async () => {
        const chatServiceMock = {
            deleteMessagesByRoom: jest.fn(),
        };
        mockSocket = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            join: jest.fn(),
            leave: jest.fn(),
            data: { roomCode: '1234' },
            id: 'admin1234',
        } as unknown as Socket;

        const module: TestingModule = await Test.createTestingModule({
            providers: [RoomService, { provide: ChatService, useValue: chatServiceMock }],
        }).compile();

        service = module.get<RoomService>(RoomService);
        service['io'] = mockServer;
        roomId = '1234';
        service.rooms = new Map();
        chatService = module.get<ChatService>(ChatService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getServer', () => {
        it('should return the server instance if initialized', () => {
            const result = service.getServer();
            expect(result).toBe(mockServer);
        });

        it('should throw an error if the server is not initialized', () => {
            service['io'] = undefined;
            expect(() => service.getServer()).toThrowError('Server is not initialized');
        });
    });

    it('should set the io server instance', () => {
        service.setServer(mockServer);
        expect(service['io']).toBe(mockServer);
    });

    describe('isRoomActive', () => {
        it('should return true if the room is active', () => {
            const mockRoom = mockRooms[0];
            service.rooms.set(roomId, mockRoom);
            const result = service.isRoomActive(roomId);
            expect(result).toBeTruthy();
        });

        it('should return false if the room is not active', () => {
            const result = service.isRoomActive(roomId);
            expect(result).toBeFalsy();
        });
    });

    describe('isPlayerAdmin', () => {
        it('should return true if the player is an admin', () => {
            service['adminList'].push(mockSocket.id);
            const result = service.isPlayerAdmin(mockSocket);
            expect(result).toBe(true);
        });

        it('should return false if the player is not an admin', () => {
            const mockSocketPlayer = { id: '1564' } as Socket;
            const result = service.isPlayerAdmin(mockSocketPlayer);
            expect(result).toBe(false);
        });
    });

    describe('generate and get RoomCode', () => {
        it('should generate a numeric room code of the correct length', () => {
            const roomCode = service['generateRoomCode']();
            expect(roomCode).toHaveLength(ACCESS_CODE_LENGTH);
            expect(roomCode).toMatch(/^\d+$/);
        });

        it('should return a unique room code that is not already active', () => {
            service['generateRoomCode'] = jest.fn().mockReturnValue(roomId);
            jest.spyOn(service, 'isRoomActive').mockReturnValueOnce(true).mockReturnValueOnce(false);
            const roomCode = service['getNewRoomCode']();
            expect(roomCode).toBe('1234');
            expect(service.isRoomActive).toHaveBeenCalledTimes(2);
        });
    });

    describe('getRoomId', () => {
        it('should return roomCode if the room is active', () => {
            jest.spyOn(service, 'isRoomActive').mockReturnValue(true);
            const roomCode = service.getRoomId(mockSocket);
            expect(roomCode).toBe(mockSocket.data.roomCode);
        });

        it('should return null if the room is not active', () => {
            jest.spyOn(service, 'isRoomActive').mockReturnValue(false);
            const roomCode = service.getRoomId(mockSocket);
            expect(roomCode).toBe(null);
        });

        it('should return null if roomCode is undefined', () => {
            mockSocket.data = undefined;
            jest.spyOn(service, 'isRoomActive').mockReturnValue(false);
            const result = service.getRoomId(mockSocket);
            expect(result).toBeNull();
        });
    });

    it('should broadcast roomDeleted event, delete the room, and leave the room', () => {
        jest.spyOn(service, 'cleanSocketsData');
        jest.spyOn(service, 'removeAdmin');
        jest.spyOn(service, 'isPlayerAdmin').mockReturnValue(true);

        service.rooms.set(roomId, mockRooms[0]);
        service.deleteRoom(roomId, mockSocket);

        expect(mockSocket.to).toHaveBeenCalledWith(roomId);
        expect(service.rooms.has(roomId)).toBe(false);
        expect(service.cleanSocketsData).toHaveBeenCalled();
        expect(service.removeAdmin).toHaveBeenCalled();
        expect(chatService.deleteMessagesByRoom).toHaveBeenCalledWith(roomId);
        expect(mockServer.in).toHaveBeenCalledWith(roomId);
        expect(mockServer.in(roomId).socketsLeave).toHaveBeenCalledWith(roomId);
    });

    it('should not join if room is not active', () => {
        service.rooms.set(roomId, mockRooms[0]);
        jest.spyOn(service, 'isRoomActive').mockReturnValue(false);
        service.joinRoom(mockSocket, roomId);

        expect(mockSocket.join).not.toHaveBeenCalledWith(roomId);
    });

    it('should join if room is active', () => {
        service.rooms.set(roomId, mockRooms[0]);
        jest.spyOn(service, 'isRoomActive').mockReturnValue(true);
        service.joinRoom(mockSocket, roomId);

        expect(mockSocket.join).toHaveBeenCalledWith(roomId);
        expect(mockSocket.data.roomCode).toBeDefined();
    });

    describe('leaveRoom', () => {
        it('should return if socket is undefined', () => {
            service.leaveRoom(roomId, undefined);
            expect(mockServer.to).not.toHaveBeenCalled();
            expect(mockSocket.leave).not.toHaveBeenCalled();
        });

        it('should leave the room, and clear socket data if socket exists', () => {
            jest.spyOn(service, 'isPlayerAdmin').mockReturnValue(false);
            service.leaveRoom(roomId, mockSocket);

            expect(mockSocket.leave).toHaveBeenCalledWith(roomId);
            expect(mockSocket.data).toEqual({});
        });
    });

    it('should create a new room and join the socket to it', () => {
        service['getNewRoomCode'] = jest.fn().mockReturnValue(roomId);
        const room = service.createRoom(mockSocket, mockGame);
        const expectedRoom = {
            gameMap: mockGame,
            roomId,
            listPlayers: [],
            availableAvatars: avatars.map((avatar) => ({ ...avatar, isTaken: false })),
            adminId: mockSocket.id,
            isLocked: false,
            gameStatus: GameStatus.Lobby,
            globalPostGameStats: defaultGlobalStats,
        };
        expect(chatService.deleteMessagesByRoom).toHaveBeenCalledWith(roomId);
        expect(room).toEqual(expectedRoom);
        expect(mockSocket.join).toHaveBeenCalledWith(roomId);
        expect(mockSocket.data.roomCode).toBe(roomId);
        expect(service['adminList']).toContain(mockSocket.id);
    });

    it('should return the room corresponding to the client', () => {
        service.rooms.set(roomId, mockRooms[0]);
        jest.spyOn(service, 'getRoomId').mockReturnValue(roomId);
        const result = service.getRoom(mockSocket);

        expect(service.getRoomId).toHaveBeenCalled();
        expect(result).toBe(mockRooms[0]);
    });

    it('should clean socket data in the specified room', () => {
        const socket1 = { id: 'socket1', data: { someData: 'data1' } } as unknown as Socket;
        const socket2 = { id: 'socket2', data: { someData: 'data2' } } as unknown as Socket;

        mockServer.sockets.adapter.rooms.set(roomId, new Set([socket1.id, socket2.id]));
        mockServer.sockets.sockets.set(socket1.id, socket1);
        mockServer.sockets.sockets.set(socket2.id, socket2);

        service.cleanSocketsData(roomId);
        expect(mockServer.sockets.sockets.get(socket1.id).data).toEqual({});
        expect(mockServer.sockets.sockets.get(socket2.id).data).toEqual({});
    });

    it('should remove the admin socket from the admin list', () => {
        service['adminList'] = ['admin1234'];
        service.removeAdmin(mockSocket);
        expect(service['adminList']).toEqual([]);
    });

    it('should retrieve the correct game map for a room', () => {
        service.rooms.set(roomId, mockRooms[0]);
        const gameMap = service.getRoomMap(roomId);
        expect(gameMap).toEqual(mockGame);
    });

    it('should return the room timers', () => {
        const turnTimerInstance = new Timer();
        const fightTimerInstance = new Timer();
        const gameTimers = { turnTimer: turnTimerInstance, fightTimer: fightTimerInstance };
        service['gameTimers'].set(roomId, gameTimers);

        const turnTimer = service.getTurnTimer(roomId);
        const fightTimer = service.getFightTimer(roomId);

        expect(turnTimer).toEqual(turnTimerInstance);
        expect(fightTimer).toEqual(fightTimerInstance);
    });
});
