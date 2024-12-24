import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Message } from '@app/interfaces/message';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';
import { SocketService } from '@app/services/socket/socket.service';
import { ChatData } from '@common/interfaces/chat-data';
@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss'],
    imports: [CommonModule, FormsModule],
    standalone: true,
})
export class ChatComponent implements AfterViewInit {
    @Input() roomId = this.roomManager.room?.code;
    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    messages: Message[] = [];
    newMessage: string = '';
    currentUser: string;

    constructor(
        private socketService: SocketService,
        private roomManager: RoomManagerService,
    ) {
        if (this.roomManager.player) this.currentUser = this.roomManager.player.userName;
    }

    async ngAfterViewInit() {
        if (this.roomId) {
            this.socketService.send<string>('joinRoom', this.roomId);

            this.socketService.on<{ userId: string; text: string; time: string }[]>(
                'messageHistory',
                (data: { userId: string; text: string; time: string }[]) => {
                    this.messages = data.map((message) => ({
                        user: message.userId,
                        text: message.text,
                        time: message.time,
                    }));
                    this.scrollToBottom();
                },
            );

            this.socketService.on<{ userId: string; text: string; time: string }>(
                'roomMessage',
                (data: { userId: string; text: string; time: string }) => {
                    const message: Message = {
                        user: data.userId,
                        text: data.text,
                        time: data.time,
                    };
                    this.messages.push(message);
                    this.scrollToBottom();
                },
            );
        }
        this.scrollToBottom();
    }

    addMessage() {
        if (this.newMessage.trim()) {
            const messageData = {
                roomId: this.roomId,
                text: this.newMessage.trim(),
            };
            this.socketService.send<ChatData>('roomMessage', messageData);
            this.newMessage = '';
        }
    }

    scrollToBottom(): void {
        setTimeout(() => {
            this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
        }, 0);
    }

    getMessageClass(message: Message): string {
        return message.user === this.currentUser ? 'sent' : 'received';
    }
}
