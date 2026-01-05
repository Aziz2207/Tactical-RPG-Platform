import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MessageType } from '@common/interfaces/message-type';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
    @Prop({ type: String, required: false })
    roomId?: string;

    @Prop({ type: String, required: true })
    username: string;

    @Prop({ type: String, required: false })
    avatarURL?: string;

    @Prop({ type: String, required: true })
    message: string;

    @Prop({ type: Date, required: true })
    timestamp: Date;

    @Prop({ type: String, enum: Object.values(MessageType), required: true })
    type: MessageType;

    @Prop({type: String, required: false})
    senderUid?: string;
}

export const messageSchema = SchemaFactory.createForClass(Message);
