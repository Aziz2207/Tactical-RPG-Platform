import { IMessage } from '@app/interfaces/message.interface';
import { ChatService } from '@app/services/chat/chat.service';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { ChatController } from './chat.controller';

describe('ChatController', () => {
    let chatController: ChatController;
    let chatService: ChatService;

    const mockMessages: IMessage[] = [
        { roomId: '4954', username: 'user1', message: 'Hello!', timestamp: new Date() },
        { roomId: '4954', username: 'user2', message: 'Hi there!', timestamp: new Date() },
    ];

    const mockChatService = {
        getMessagesByRoom: jest.fn().mockResolvedValue(mockMessages),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ChatController],
            providers: [{ provide: ChatService, useValue: mockChatService }],
        }).compile();

        chatController = module.get<ChatController>(ChatController);
        chatService = module.get<ChatService>(ChatService);
    });

    it('should be defined', () => {
        expect(chatController).toBeDefined();
    });

    describe('getMessagesByRoomId', () => {
        it('should return messages array for a given room ID', async () => {
            const response: Partial<Response> = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            await chatController.getMessagesByRoomId('4954', response as Response);
            expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(response.json).toHaveBeenCalledWith(mockMessages);
            expect(chatService.getMessagesByRoom).toHaveBeenCalledWith('4954');
        });

        it('should handle errors and respond with a bad request status', async () => {
            jest.spyOn(chatService, 'getMessagesByRoom').mockRejectedValue(new Error('Test error'));

            const response: Partial<Response> = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };

            await chatController.getMessagesByRoomId('invalid-room-id', response as Response);
            expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(response.send).toHaveBeenCalledWith('Test error');
        });
    });
});
