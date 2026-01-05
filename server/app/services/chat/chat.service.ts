import { IMessage } from '@app/interfaces/message.interface';
import { Message } from '@app/model/schema/message.schema';
import { MessageType } from '@common/interfaces/message-type';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ChatService {
    constructor(@InjectModel(Message.name) private messageModel: Model<Message>) {}

    async saveMessage(message: IMessage): Promise<Message> {
        const createdMessage = new this.messageModel(message);
        return createdMessage.save();
    }

    async getMessagesByRoom(roomId: string): Promise<Message[]> {
        return this.messageModel.find({ roomId }).sort({ timestamp: 1 }).exec();
    }

    async getMessagesByType(type: MessageType, roomId?: string): Promise<Message[]> {
        const query: any = { type };
        
        if ((type === MessageType.ROOM || type === MessageType.PRIVATE || type === MessageType.SPECTATOR) && roomId) {
            query.roomId = roomId;
        } else if (type === MessageType.GLOBAL) {
            query.roomId = 'global';
        }
        
        return this.messageModel.find(query).sort({ timestamp: 1 }).exec();
    }

    async deleteMessagesByRoom(roomId: string): Promise<void> {
        await this.messageModel.deleteMany({ roomId }).exec();
    }
}
