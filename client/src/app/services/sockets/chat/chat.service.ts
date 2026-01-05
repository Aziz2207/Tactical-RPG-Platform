import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MAX_GENERATION_VALUE } from '@app/constants';
import { ILogMessage } from '@app/interfaces/backend-interfaces/log.interface';
import { IMessage } from '@app/interfaces/backend-interfaces/message.interface';
import { ChatMessage } from '@app/interfaces/chat-message';
import { LogMessage } from '@app/interfaces/log-message';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { ClientToServerEvent, ServerToClientEvent } from '@common/socket.events';
import { MessageType } from '@common/interfaces/message-type';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Subject } from 'rxjs';
import { UserAccountService } from '@app/services/user-account/user-account/user-account.service';
import { BehaviorSubject } from 'rxjs';

interface TypingEventPayload {
    uid: string;
    roomId: string;
    type: MessageType;
}

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    private chatsUrl = `${environment.serverUrl}/chat`;
    private messagesSubject = new Subject<ChatMessage>();
    public messages$ = this.messagesSubject.asObservable();
    private reloadGlobalMessagesSource = new BehaviorSubject<boolean>(false);
    reloadGlobalMessages$ = this.reloadGlobalMessagesSource.asObservable();
    private typingStatus = new Map<string, boolean>();
    typingStatusChanged$ = new BehaviorSubject<TypingEventPayload | null>(null);
    triggerReloadGlobalMessages() {
        this.reloadGlobalMessagesSource.next(true);
    }
    constructor(
        private socketCommunication: SocketCommunicationService,
        private http: HttpClient,
        private userAccountService: UserAccountService
    ) {
        this.initTypingListeners;
    }

    sendMessage(content: string, type: MessageType, roomId?: string) {
        if (!content) return;

        const cleanedContent = content.trim();

        if (!cleanedContent) return;

        const message: IMessage = {
            message: cleanedContent,
            type,
            ...(type !== MessageType.GLOBAL && roomId ? { roomId } : {}),
        };

        this.socketCommunication.send(ClientToServerEvent.SendMessage, message);
    }

    onMessageReceived(callback: (message: ChatMessage, type: MessageType) => void) {
        this.socketCommunication.on<IMessage>(ServerToClientEvent.MessageReceived, (backendMessage) => {
            const formattedMessage: ChatMessage = {
                id: this.generateUniqueId(),
                username: backendMessage.username || 'Inconnu',
                message: backendMessage.message,
                timestamp: backendMessage.timestamp || new Date(),
                senderUid: backendMessage.senderUid || 'Inconnu',
                roomId: backendMessage.roomId ?? undefined,
                avatarURL: backendMessage.avatarURL ?? null,
            };
            callback(formattedMessage, backendMessage.type);
        });
    }

    onLogReceived(callback: (message: LogMessage) => void) {
        this.socketCommunication.on<ILogMessage>(ServerToClientEvent.LogReceived, (backendMessage) => {
            const formattedMessage: LogMessage = {
                id: this.generateUniqueId(),
                message: backendMessage.message,
                timestamp: backendMessage.timestamp,
                players: backendMessage.players,
            };
            callback(formattedMessage);
        });
    }

    generateUniqueId(): number {
        return Math.floor(Math.random() * MAX_GENERATION_VALUE);
    }

    getMessagesByType(type: MessageType, roomCode?: string): Observable<ChatMessage[]> {
        let params = new HttpParams().set('type', type);
        if (roomCode && (type === MessageType.ROOM || type === MessageType.PRIVATE || type === MessageType.SPECTATOR)) {
            params = params.set('roomCode', roomCode);
        }

        return this.http.get<ChatMessage[]>(this.chatsUrl, { params }).pipe(
            map((messages: ChatMessage[]) => {
                const currentUser = this.userAccountService.accountDetails();
                const myUid = currentUser?.uid;


                const blockedUsers = this.userAccountService.blockedUsers.map(u => u.uid);    
                const blockedByUsers = this.userAccountService.blockedByUsers.map(u => u.uid); 

                return messages
                    .filter((m) => {
                        if (!m.senderUid || !myUid) return true;

                        const iBlockedHim = blockedUsers.includes(m.senderUid);
                        const heBlockedMe = blockedByUsers.includes(m.senderUid);

                        const visible = !(iBlockedHim || heBlockedMe);

                        return visible;
                    })
                    .map((backendMessage) => ({
                        id: this.generateUniqueId(),
                        username: backendMessage.username,
                        message: backendMessage.message,
                        timestamp: backendMessage.timestamp,
                        senderUid: backendMessage.senderUid || 'Inconnu',
                        roomId: (backendMessage as any).roomId ?? undefined,
                        avatarURL: (backendMessage as any).avatarURL ?? null,
                        type,
                    }));
            })
        );
    }

    getMessagesByRoom(roomCode: string): Observable<ChatMessage[]> {
        return this.getMessagesByType(MessageType.ROOM, roomCode);
    }

    getGlobalMessages(): Observable<ChatMessage[]> {
        return this.getMessagesByType(MessageType.GLOBAL);
    }

    initTypingListeners() {
        this.socketCommunication.on<TypingEventPayload>(
            ServerToClientEvent.UserTyping,
            (data) => {
                this.typingStatus.set(data.uid, true);
                this.typingStatusChanged$.next(data);
            }
        );

        this.socketCommunication.on<TypingEventPayload>(
            ServerToClientEvent.UserStopTyping,
            (data) => {
                this.typingStatus.set(data.uid, false);
                this.typingStatusChanged$.next(data);
            }
        );
    }

    isUserTyping(uid: string): boolean {
        return this.typingStatus.get(uid) === true;
    }

    sendTyping(roomId: string | undefined, type: MessageType) {
        const uid = this.userAccountService.accountDetails()?.uid;
        this.socketCommunication.send(ClientToServerEvent.Typing, {
            uid,
            roomId,
            type,
            isTyping: true
        });
    }


    sendStopTyping(roomId: string | undefined, type: MessageType) {
        const uid = this.userAccountService.accountDetails()?.uid;
        this.socketCommunication.send(ClientToServerEvent.StopTyping, {
            uid,
            roomId,
            type,
            isTyping: false
        });
    }
}
