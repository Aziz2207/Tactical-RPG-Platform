import { Message } from '@app/interfaces/message';
import { RoomService } from '@app/services/rooms/rooms.service';
import { ChatEvents } from '@common/event-enums/chat.gateway.events';
import { ChatData } from '@common/interfaces/chat-data';
import { Injectable } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    namespace: 'gameSession',
    cors: true,
})
@Injectable()
export class ChatGateway {
    @WebSocketServer() private server: Server;
    private messageHistory: Map<string, Message[]> = new Map<string, Message[]>();

    constructor(private roomService: RoomService) {}

    @SubscribeMessage(ChatEvents.JoinRoom)
    joinRoom(socket: Socket, roomId: string) {
        this.roomService.joinRoom(roomId, socket);
        const messages = this.messageHistory.get(roomId) || [];
        socket.emit(ChatEvents.MessageHistory, messages);
    }

    @SubscribeMessage(ChatEvents.RoomMessage)
    roomMessage(socket: Socket, payload: ChatData) {
        const { roomId, text } = payload;
        const roomFound = this.roomService.checkRoomExists(roomId);
        if (roomFound && socket.rooms.has(roomId)) {
            const player = this.roomService.findPlayerBySocketId(roomId, socket.id);
            if (player) {
                const formatter = new Intl.DateTimeFormat('fr-CA', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: 'America/Toronto',
                });
                const message = {
                    userId: player.userName,
                    text,
                    time: formatter.format(new Date()),
                };

                if (!this.messageHistory.get(roomId)) {
                    this.messageHistory.set(roomId, []);
                }
                this.messageHistory.get(roomId).push(message);
                this.server.to(roomId).emit(ChatEvents.RoomMessage, message);
            }
        }
    }
}
