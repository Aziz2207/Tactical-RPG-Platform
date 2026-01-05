import { IMessage } from '@app/interfaces/message.interface';
import { Message, messageSchema } from '@app/model/schema/message.schema';
import { getConnectionToken, getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { ChatService } from './chat.service';

describe('ChatService', () => {
    let service: ChatService;
    let mongoServer: MongoMemoryServer;
    let messageModel: Model<Message>;
    let connection: Connection;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();

        const module: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRootAsync({
                    useFactory: async () => ({
                        uri: mongoServer.getUri(),
                    }),
                }),
                MongooseModule.forFeature([{ name: Message.name, schema: messageSchema }]),
            ],
            providers: [ChatService],
        }).compile();

        service = module.get<ChatService>(ChatService);
        messageModel = module.get<Model<Message>>(getModelToken(Message.name));
        connection = await module.get(getConnectionToken());
    });

    afterEach(async () => {
        await messageModel.deleteMany({});
    });

    afterAll(async () => {
        await mongoServer.stop();
        await connection.close();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('saveMessage', () => {
        it('should save a message and return the saved message', async () => {
            const messageData: IMessage = {
                roomId: 'room123',
                username: 'Vegeta',
                message: 'I am the prince of all Saiyans!',
                timestamp: new Date(),
            };

            const savedMessage = await service.saveMessage(messageData);

            expect(savedMessage).toBeDefined();
            expect(savedMessage.roomId).toBe(messageData.roomId);
            expect(savedMessage.username).toBe(messageData.username);
            expect(savedMessage.message).toBe(messageData.message);

            const foundMessage = await messageModel.findById(savedMessage._id);
            expect(foundMessage).toBeDefined();
            expect(foundMessage.message).toBe('I am the prince of all Saiyans!');
        });
    });

    describe('getMessagesByRoom', () => {
        it('should return messages by roomId sorted by timestamp', async () => {
            const roomId = 'room123';

            const messages: IMessage[] = [
                { roomId, username: 'Vegeta', message: "Let's fight Kakarot", timestamp: new Date() },
                { roomId, username: 'Kakarot', message: 'Okay Vegeta', timestamp: new Date() },
                { roomId, username: 'Vegeta', message: 'Galick Gun', timestamp: new Date() },
            ];

            await messageModel.insertMany(messages);

            const foundMessages = await service.getMessagesByRoom(roomId);

            expect(foundMessages.length).toBe(MESSAGES_LENGTH);
            expect(foundMessages[0].message).toBe("Let's fight Kakarot");
            expect(foundMessages[1].message).toBe('Okay Vegeta');
            expect(foundMessages[2].message).toBe('Galick Gun');
        });

        it('should return an empty array if no messages are found for the roomId', async () => {
            const roomId = 'roomNotExist';

            const foundMessages = await service.getMessagesByRoom(roomId);

            expect(foundMessages.length).toBe(0);
        });
    });

    describe('deleteMessagesByRoom', () => {
        it('should delete messages by roomId', async () => {
            const roomId = 'room123';

            const messages: IMessage[] = [
                { roomId, username: 'Vegeta', message: "Let's fight Kakarot", timestamp: new Date() },
                { roomId, username: 'Kakarot', message: 'Okay Vegeta', timestamp: new Date() },
                { roomId, username: 'Vegeta', message: 'Galick Gun', timestamp: new Date() },
            ];

            await messageModel.insertMany(messages);

            await service.deleteMessagesByRoom(roomId);

            const foundMessages = await service.getMessagesByRoom(roomId);

            expect(foundMessages.length).toBe(0);
        });

        it('should not throw an error if no messages are found for the roomId', async () => {
            const roomId = 'roomNotExist';

            await service.deleteMessagesByRoom(roomId);

            const foundMessages = await service.getMessagesByRoom(roomId);

            expect(foundMessages.length).toBe(0);
        });
    });
    const MESSAGES_LENGTH = 3;
});
