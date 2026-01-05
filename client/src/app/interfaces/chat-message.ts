import { MessageType } from '@common/interfaces/message-type';

export interface ChatMessage {
    id: number;
    timestamp: Date;
    username: string;
    message: string;
    roomId?: string;         
    type?: MessageType;   
    senderUid?: string;   
    avatarURL?: string | null; 
}