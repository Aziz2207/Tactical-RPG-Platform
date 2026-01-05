import { CommonModule } from "@angular/common";
import {
    AfterViewChecked,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ViewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { ChatMessageComponent } from "@app/components/chat-message/chat-message.component";
import { ChatMessage } from "@app/interfaces/chat-message";
import { LogMessage } from "@app/interfaces/log-message";
import { ChatService } from "@app/services/sockets/chat/chat.service";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import { MessageType } from '@common/interfaces/message-type';
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";

@Component({
    selector: "app-chat-box",
    standalone: true,
    imports: [ChatMessageComponent, CommonModule, FormsModule, TranslateModule],
    templateUrl: "./chat-box.component.html",
    styleUrl: "./chat-box.component.scss",
})
export class ChatBoxComponent implements OnInit, AfterViewChecked, OnDestroy {
    @ViewChild("messageContainer") messageContainer: ElementRef<HTMLDivElement>;
    @ViewChild("logContainer") logContainer: ElementRef<HTMLDivElement>;
    @Input() isToggleable: boolean;
    @Input() roomCode?: string | null;
    @Input() areLogsVisible: boolean = false;
    @Input() isSidebarChannel?: boolean = false;
    @Input() isSpectator: boolean = false;
    @Output() chatFocusChange = new EventEmitter<boolean>();

    messages: ChatMessage[] = [];
    logs: LogMessage[] = [];
    filteredLogs: LogMessage[] = [];
    newMessage: string = "";
    newLog: string = "";
    areLogsFiltered: boolean = false;
    chatType: string = this.translate.instant("CHAT_BOX.DEFAULT_TITLE");
    toggleIconImage: string = "./assets/images/icones/chat-message.png";
    private routeSub: Subscription;
    private isAtBottom = true;
    private typingUsers = new Set<string>();
    currentTypingUser: string | null = null;
    typingTimeout: any;


    constructor(
        private chatService: ChatService,
        private route: ActivatedRoute,
        private socketCommunicationService: SocketCommunicationService,
        private translate: TranslateService,
        private userAccountService: UserAccountService,
    ) {
        this.chatService.initTypingListeners();
    }

    get toggleIconClass() {
        return this.areLogsVisible ? "icon-logs" : "icon-chat";
    }

    get messagesContainerClass() {
        return {
            "past-messages": true,
            "sidebar-channel": this.isSidebarChannel,
        };
    }

    onFocus() {
        this.chatFocusChange.emit(true);
    }

    onBlur() {
        this.chatFocusChange.emit(false);
    }

    getActiveContainer() {
        return this.areLogsVisible ? this.logContainer : this.messageContainer;
    }

    onScroll() {
        const container = this.getActiveContainer();
        const element = container.nativeElement;
        this.isAtBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight <=
            1;
    }

    ngOnInit() {
        this.chatType = this.translate.instant('CHAT.TITLE');

        if (this.roomCode) {
            this.loadMessages();
        } else {
            this.routeSub = this.route.queryParams.subscribe((params) => {
            this.roomCode = params["roomCode"];
            this.loadMessages();
            });
        }

        this.chatService.onMessageReceived((message: ChatMessage, type: MessageType) => {
            const expectedType = this.isSpectator ? MessageType.SPECTATOR : MessageType.ROOM;
            if (type === expectedType && message.roomId === this.roomCode) {
            this.messages.push(message);
            }
        });

        this.chatService.onLogReceived((message: LogMessage) => {
            const translatedMessage = this.translateLogMessage(message.message);
            const translatedLog = { ...message, message: translatedMessage };
            if (this.isPlayerInLog(message)) {
            this.filteredLogs.push(translatedLog);
            }
            this.logs.push(translatedLog);
        });

        this.chatService.typingStatusChanged$.subscribe(payload => {
            if (!payload) return;
            if (payload.type !== MessageType.ROOM) return;
            if (payload.roomId !== this.roomCode) return;

            const uid = payload.uid;

            const isFriend = this.userAccountService.friends.some(f => f.uid === uid);
            if (!isFriend) return;

            const isTyping = this.chatService.isUserTyping(uid);

            if (isTyping) {
                this.typingUsers.add(uid);
            } else {
                this.typingUsers.delete(uid);
            }

            this.updateTypingIndicator();
        });

    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    sendMessage() {
        if (this.newMessage.trim() && !this.areLogsVisible && this.roomCode) {
            const messageType = this.isSpectator ? MessageType.SPECTATOR : MessageType.ROOM;
            this.chatService.sendMessage(this.newMessage, messageType, this.roomCode);
            this.newMessage = '';
        }
    }

    ngOnDestroy() {
        if (this.routeSub) {
            this.routeSub.unsubscribe();
        }
    }

    toggleChatLogs() {
        if (this.isToggleable) {
            this.areLogsVisible = !this.areLogsVisible;
            this.chatType = this.translate.instant(
                this.areLogsVisible ? 'CHAT.UNFILTERED_JOURNAL' : 'CHAT.TITLE'
            );
        }
    }

    toggleLogsFilter() {
        this.areLogsFiltered = !this.areLogsFiltered;
        this.chatType = this.translate.instant(
            this.areLogsFiltered ? 'CHAT.FILTERED_JOURNAL' : 'CHAT.UNFILTERED_JOURNAL'
        );
    }

    private translateLogMessage(message: string): string {
        // Check if it's already a translated message (doesn't contain GAME.LOGS)
        if (!message.includes('GAME.LOGS.')) {
            return message;
        }

        const parts = message.split('|');
        const translationKey = parts[0];
        
        const params: { [key: string]: string } = {};
        for (let i = 1; i < parts.length; i++) {
            const [key, value] = parts[i].split(':');
            if (key && value) {
                if (key === 'itemKey') {
                    params['itemKey'] = this.translate.instant(value);
                } else {
                    params[key] = value;
                }
            }
        }

        return this.translate.instant(translationKey, params);
    }

    private isPlayerInLog(message: LogMessage) {
        return message.players.some(
            (player) => player.id === this.socketCommunicationService.socket.id
        );
    }

    private loadMessages() {
        if (!this.roomCode) return;
        const messageType = this.isSpectator ? MessageType.SPECTATOR : MessageType.ROOM;
        this.chatService
            .getMessagesByType(messageType, this.roomCode)
            .subscribe((messages) => {
                if (messages.length !== 0) {
                    this.messages = messages;
                }
            });
    }

    private scrollToBottom() {
        const container = this.getActiveContainer();
        if (container && this.isAtBottom) {
            container.nativeElement.scrollTop =
                container.nativeElement.scrollHeight;
        }
    }

    onInputChange() {
        if (!this.roomCode || this.areLogsVisible) return;

        this.chatService.sendTyping(this.roomCode, MessageType.ROOM);

        clearTimeout(this.typingTimeout);

        this.typingTimeout = setTimeout(() => {
            this.chatService.sendStopTyping(this.roomCode ?? undefined, MessageType.ROOM);
        }, 1000);
    }

    private updateTypingIndicator() {
        const someone = this.translate.instant("CHAT_BOX.SOMEONE");
        const andWord = this.translate.instant("CHAT_BOX.AND");
        const othersWord = this.translate.instant("CHAT_BOX.OTHERS");
        const users = Array.from(this.typingUsers)
            .map(uid => this.userAccountService.getUserByUid(uid)?.username ?? someone);

        if (users.length === 0) {
            this.currentTypingUser = null;
        }
        else if (users.length === 1) {
            this.currentTypingUser = `${users[0]} ...`;
        }
        else if (users.length === 2) {
            this.currentTypingUser = `${users[0]} ${andWord} ${users[1]} ...`;
        }
        else {
            this.currentTypingUser = `${users[0]}, ${users[1]} ${andWord} ${users.length - 2} ${othersWord} ...`;
        }
    }
}