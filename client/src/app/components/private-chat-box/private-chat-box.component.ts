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
import { ChatService } from "@app/services/sockets/chat/chat.service";
import { SocketCommunicationService } from "@app/services/sockets/socket-communication/socket-communication.service";
import { Subscription } from "rxjs";
import { OnChanges, SimpleChanges } from "@angular/core";
import { MessageType } from '@common/interfaces/message-type';
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

@Component({
    selector: "app-private-chat-box",
    standalone: true,
    imports: [ChatMessageComponent, CommonModule, FormsModule, TranslateModule],
    templateUrl: "./private-chat-box.component.html",
    styleUrl: "./private-chat-box.component.scss",
})
export class PrivateChatBoxComponent implements OnInit, OnChanges, AfterViewChecked, OnDestroy {
    @ViewChild("messageContainer") messageContainer: ElementRef<HTMLDivElement>;
    @Input() isToggleable: boolean;
    @Input() isSidebarChannel?: boolean = false;
    @Input() roomCode: string | null = null;
    @Output() chatFocusChange = new EventEmitter<boolean>();

    messages: ChatMessage[] = [];
    newMessage: string = "";
    chatType: string = "Messagerie";
    toggleIconImage: string = "./assets/images/icones/chat-message.png";
    roomPartnerUid?: string;
    private routeSub: Subscription;
    private isAtBottom = true;
    private typingUsers = new Set<string>();
    currentTypingUser: string | null = null;
    typingTimeout: any;

    constructor(
        private chatService: ChatService,
        private route: ActivatedRoute,
        private socketCommunicationService: SocketCommunicationService,
        private userAccountService: UserAccountService,
        private translate: TranslateService
    ) {}

    get toggleIconClass() {
        return "icon-chat";
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

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['roomCode'] && !changes['roomCode'].firstChange) {
        this.messages = [];
        this.loadMessages();
        this.scrollToBottom();
        }
    }

    onBlur() {
        this.chatFocusChange.emit(false);
    }

    onScroll() {
        const container = this.messageContainer;
        const element = container.nativeElement;
        this.isAtBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight <=
            1;
    }

    async ngOnInit() {
        await this.socketCommunicationService.connect();
        const user = this.userAccountService.accountDetails();
        const myUid = user?.uid; 
        const participants = this.roomCode?.split('_') ?? []; 
        this.roomPartnerUid = participants.find(uid => uid !== myUid);
        if (!this.roomCode) {
            this.routeSub = this.route.queryParams.subscribe((params) => {
            this.roomCode = params["roomCode"] ?? null;
            this.loadMessages();
            });
        } else {
            this.loadMessages(); 
        }

        this.chatService.onMessageReceived((message: ChatMessage, type: MessageType) => {
            const isPrivateType = type === MessageType.PRIVATE && message.roomId === this.roomCode;
            const sameRoom = message.roomId === this.roomCode;


            if (isPrivateType && sameRoom) {

            if (message.senderUid) {

                const blocked = this.userAccountService.blockedUsers.some(
                    u => u.uid === message.senderUid
                );

                const hasBlocked = this.userAccountService.isUserBlocked(message.senderUid);

                if (blocked || hasBlocked) {
                    return;
                }
            }

                this.messages.push(message);
                this.scrollToBottom();
            }
        });

        this.chatService.typingStatusChanged$.subscribe(payload => {
            if (!payload) return;
            if (payload.type !== MessageType.PRIVATE) return;
            if (payload.roomId !== this.roomCode) return;

            const isFriend = this.userAccountService.friends
                .some(f => f.uid === payload.uid);
            if (!isFriend) return;

            const isTyping = this.chatService.isUserTyping(payload.uid);

            if (isTyping) {
                this.typingUsers.add(payload.uid);
            } else {
                this.typingUsers.delete(payload.uid);
            }

            this.updateTypingIndicator();
        });

        this.chatType = "Messagerie";
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    sendPrivateMessage() {
        if (!this.newMessage.trim()) return;
        const blocked = this.roomPartnerUid 
            ? this.userAccountService.blockedUsers.some(u => u.uid === this.roomPartnerUid)
            : false;

        const hasBlocked = this.roomPartnerUid 
            ? this.userAccountService.isUserBlocked(this.roomPartnerUid)
            : false;

        if (blocked || hasBlocked) {
            console.warn("Message non envoyé : blocage actif.");
            return;
        }

        this.chatService.sendMessage(
            this.newMessage,
            MessageType.PRIVATE,
            this.roomCode ?? undefined
        );

        this.newMessage = '';
        this.scrollToBottom();
    }

    ngOnDestroy() {
        if (this.routeSub) {
            this.routeSub.unsubscribe();
        }
    }

    private loadMessages() {
        if (this.roomCode) {
            this.chatService.getMessagesByType(MessageType.PRIVATE, this.roomCode).subscribe((messages: ChatMessage[]) => {
                const filtered = messages.filter(m => {
                    if (!m.senderUid) return true;

                    const blocked = this.userAccountService.blockedUsers.some(u => u.uid === m.senderUid);
                    const hasBlocked = this.userAccountService.isUserBlocked(m.senderUid);

                    return !blocked && !hasBlocked;
                });

                this.messages = filtered;
            });
        }
    }

    private scrollToBottom() {
        const container = this.messageContainer;
        if (container && this.isAtBottom) {
            container.nativeElement.scrollTop =
                container.nativeElement.scrollHeight;
        }
    }

    onInputChange() {
        if (!this.roomCode) return;

        this.chatService.sendTyping(this.roomCode, MessageType.PRIVATE);

        clearTimeout(this.typingTimeout);

        this.typingTimeout = setTimeout(() => {
            this.chatService.sendStopTyping(this.roomCode ?? undefined, MessageType.PRIVATE);
        }, 1000);
    }

    private updateTypingIndicator() {
        const someone = this.translate.instant("CHAT_BOX.SOMEONE");
        const andWord = this.translate.instant("CHAT_BOX.AND");
        const othersWord = this.translate.instant("CHAT_BOX.OTHERS");
        const users = Array.from(this.typingUsers).map(
            uid => this.userAccountService.getUserByUid(uid)?.username ?? someone
        );

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

