import { Message, messageSchema } from '@app/model/schema/message.schema';
import { ChatModule } from '@app/modules/chat/chat.module';
import { ChatService } from '@app/services/chat/chat.service';
import { RoomService } from '@app/services/room/room.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RoomModule } from './room.module';

describe('RoomModule', () => {
    let module: TestingModule;
    let chatService: ChatService;
    let mongoServer: MongoMemoryServer;
    let roomService: RoomService;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();

        module = await Test.createTestingModule({
            imports: [
                RoomModule,
                MongooseModule.forRootAsync({
                    useFactory: async () => ({
                        uri: mongoServer.getUri(),
                    }),
                }),
                MongooseModule.forFeature([{ name: Message.name, schema: messageSchema }]),
                ChatModule,
            ],
        }).compile();

        roomService = module.get<RoomService>(RoomService);
        chatService = module.get<ChatService>(ChatService);
    });

    afterAll(async () => {
        await module.close();
        await mongoServer.stop();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should have a room service', () => {
        expect(roomService).toBeDefined();
    });

    it('should have a chat service', () => {
        expect(chatService).toBeDefined();
    });
});
