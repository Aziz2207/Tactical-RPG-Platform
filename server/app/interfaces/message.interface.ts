import { MessageType } from '@common/interfaces/message-type';

export interface IMessage {
    roomId?: string;
    username?: string;
    avatarURL?: string | null;
    message: string;
    timestamp?: Date;
    type: MessageType;
    senderUid?: string; 
}
