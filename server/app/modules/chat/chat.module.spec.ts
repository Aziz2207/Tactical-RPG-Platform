import { Message, messageSchema } from '@app/model/schema/message.schema';
import { ChatService } from '@app/services/chat/chat.service';
import { Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ChatModule } from './chat.module';

describe('ChatModule', () => {
    let module: TestingModule;
    let chatService: ChatService;
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();

        module = await Test.createTestingModule({
            imports: [
                MongooseModule.forRootAsync({
                    useFactory: async () => ({
                        uri: mongoServer.getUri(),
                    }),
                }),
                MongooseModule.forFeature([{ name: Message.name, schema: messageSchema }]),
                ChatModule,
            ],
            providers: [ChatService, Logger],
        }).compile();

        chatService = module.get<ChatService>(ChatService);
    });

    afterAll(async () => {
        await module.close();
        await mongoServer.stop();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
        expect(chatService).toBeDefined();
    });
});
