import { RoomService } from '@app/services/rooms/rooms.service';
import { ChatEvents } from '@common/event-enums/chat.gateway.events';
import { Player } from '@common/interfaces/player';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { ChatGateway } from './chat.gateway';

jest.mock('@app/services/rooms/rooms.service');
jest.mock('@nestjs/common/services/logger.service');

describe('ChatGateway', () => {
    let gateway: ChatGateway;
    let roomService: RoomService;
    let mockServer: Partial<Server>;
    let mockSocket: Partial<Socket>;

    beforeEach(async () => {
        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        mockSocket = {
            emit: jest.fn(),
            id: 'socket-id',
            rooms: new Set(['room-id']),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatGateway,
                RoomService,
                Logger,
                {
                    provide: 'server',
                    useValue: mockServer,
                },
            ],
        }).compile();

        gateway = module.get<ChatGateway>(ChatGateway);
        roomService = module.get<RoomService>(RoomService);

        gateway['server'] = mockServer as Server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('joinRoom', () => {
        it('should add socket to room and send message history', () => {
            const roomId = 'room-id';
            const messages = [{ userId: 'user1', text: 'Hello', time: '12:00' }];
            gateway['messageHistory'].set(roomId, messages);

            jest.spyOn(roomService, 'joinRoom');

            gateway.joinRoom(mockSocket as Socket, roomId);

            expect(roomService.joinRoom).toHaveBeenCalledWith(roomId, mockSocket);
            expect(mockSocket.emit).toHaveBeenCalledWith(ChatEvents.MessageHistory, messages);
        });
    });

    describe('roomMessage', () => {
        it('should emit message to room if room exists and user is in the room', () => {
            const roomId = 'room-id';
            const text = 'Hello';
            const payload = { roomId, text };

            jest.spyOn(roomService, 'checkRoomExists').mockReturnValue(true);
            jest.spyOn(roomService, 'findPlayerBySocketId').mockReturnValue({
                userName: 'testUser',
                attributes: {
                    speedPoints: 0,
                    currentSpeed: 0,
                    lifePoints: 0,
                    currentHP: 0,
                    offensePoints: 0,
                    defensePoints: 0,
                    diceChoice: 'attack',
                    actionLeft: 1,
                },
                characterType: '',
                isHost: false,
                socketId: '',
                nbWins: 0,
            } as unknown as Player);

            gateway.roomMessage(mockSocket as Socket, payload);

            const message = {
                userId: 'testUser',
                text,
                time: expect.any(String),
            };

            expect(mockServer.to).toHaveBeenCalledWith(roomId);
            expect(mockServer.emit).toHaveBeenCalledWith(ChatEvents.RoomMessage, message);
            expect(gateway['messageHistory'].get(roomId)).toContainEqual(message);
        });

        it('should not emit message if room does not exist', () => {
            const roomId = 'invalid-room';
            const text = 'Hello';
            const payload = { roomId, text };

            jest.spyOn(roomService, 'checkRoomExists').mockReturnValue(false);

            gateway.roomMessage(mockSocket as Socket, payload);

            expect(mockServer.to).not.toHaveBeenCalled();
            expect(mockServer.emit).not.toHaveBeenCalled();
        });

        it('should not emit message if user is not in the room', () => {
            const roomId = 'room-id';
            const text = 'Hello';
            const payload = { roomId, text };

            jest.spyOn(roomService, 'checkRoomExists').mockReturnValue(true);
            jest.spyOn(roomService, 'findPlayerBySocketId').mockReturnValue(null);

            gateway.roomMessage(mockSocket as Socket, payload);

            expect(mockServer.to).not.toHaveBeenCalled();
            expect(mockServer.emit).not.toHaveBeenCalled();
        });
    });
});
