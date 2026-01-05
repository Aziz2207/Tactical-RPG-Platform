import { ChatController } from '@app/controllers/chat/chat.controller';
import { Message, messageSchema } from '@app/model/schema/message.schema';
import { LoggerModule } from '@app/modules/logger/logger.module';
import { ChatService } from '@app/services/chat/chat.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [LoggerModule, MongooseModule.forFeature([{ name: Message.name, schema: messageSchema }])],
    controllers: [ChatController],
    providers: [ChatService],
    exports: [ChatService],
})
export class ChatModule {}
