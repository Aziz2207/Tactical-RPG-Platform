import { IMessage } from '@app/interfaces/message.interface';
import { ChatService } from '@app/services/chat/chat.service';
import { RoomService } from '@app/services/room/room.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { MessageService } from './message.service';

describe('MessageService', () => {
    let service: MessageService;
    let socket: jest.Mocked<Socket>;
    let server: jest.Mocked<Server>;
    let roomService: RoomService;
    let chatService: ChatService;
    let roomId: string;

    beforeEach(async () => {
        const roomServiceMock = {
            setServer: jest.fn(),
            joinRoom: jest.fn(),
            createRoom: jest.fn(),
            leaveRoom: jest.fn(),
            isPlayerAdmin: jest.fn(),
            deleteRoom: jest.fn(),
            getRoom: jest.fn(),
            getRoomId: jest.fn(),
            rooms: new Map(),
        };

        const chatServiceMock = {
            saveMessage: jest.fn(),
            getMessagesByRoom: jest.fn(),
        };

        const broadcastOperator = {
            emit: jest.fn(),
        };

        socket = {
            emit: jest.fn(),
            to: jest.fn().mockReturnValue({ emit: jest.fn() }),
            data: {},
        } as unknown as jest.Mocked<Socket>;

        server = {
            to: jest.fn().mockReturnValue(broadcastOperator),
            sockets: {
                sockets: new Map(),
                adapter: {
                    rooms: new Map(),
                },
            },
        } as unknown as jest.Mocked<Server>;

        roomId = '1234';

        const module: TestingModule = await Test.createTestingModule({
            providers: [MessageService, { provide: RoomService, useValue: roomServiceMock }, { provide: ChatService, useValue: chatServiceMock }],
        }).compile();

        service = module.get<MessageService>(MessageService);
        roomService = module.get<RoomService>(RoomService);
        chatService = module.get<ChatService>(ChatService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should handle sending and saving a message successfully', async () => {
        const spyOnSaveMessage = jest.spyOn(service, 'saveMessage');

        socket.data.username = 'Luffy';
        socket.data.roomCode = roomId;

        const mockMessageData: IMessage = {
            roomId,
            username: socket.data.username,
            message: 'I am going to be the Pirate King!',
            timestamp: new Date(),
        };

        (chatService.saveMessage as jest.Mock).mockResolvedValue(mockMessageData);
        (roomService.getRoomId as jest.Mock).mockReturnValue(roomId);

        await service.onMessageReceived(socket, server, mockMessageData);

        expect(spyOnSaveMessage).toHaveBeenCalledWith(socket, server, mockMessageData);
        expect(chatService.saveMessage).toHaveBeenCalledWith(mockMessageData);
        expect(roomService.getRoomId).toHaveBeenCalledWith(socket);
        expect(server.to).toHaveBeenCalledWith(roomId);

        const broadcastOperator = server.to(roomId);
        expect(broadcastOperator.emit).toHaveBeenCalledWith('messageReceived', mockMessageData);
    });

    it('should emit an errorMessage on saveMessage failure', async () => {
        const spyOnSaveMessage = jest.spyOn(service, 'saveMessage');

        socket.data.username = 'Vegeta';
        socket.data.roomCode = roomId;
        const mockMessageData: IMessage = {
            roomId,
            username: socket.data.username,
            message: 'I am the prince of all Saiyans!',
            timestamp: new Date(),
        };

        const failedMessage = 'Save failed';
        (roomService.getRoomId as jest.Mock).mockReturnValue(roomId);
        (chatService.saveMessage as jest.Mock).mockRejectedValue(new Error(failedMessage));

        await service.onMessageReceived(socket, server, mockMessageData);

        expect(roomService.getRoomId).toHaveBeenCalledWith(socket);
        expect(spyOnSaveMessage).toHaveBeenCalledWith(socket, server, mockMessageData);
        expect(chatService.saveMessage).toHaveBeenCalledWith(mockMessageData);
        expect(socket.emit).toHaveBeenCalledWith('errorMessage', 'Failed to send message.');
    });
});
