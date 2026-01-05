import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessageComponent } from '@app/components/chat-message/chat-message.component';
import { ChatMessage } from '@app/interfaces/chat-message';
import { ChatService } from '@app/services/sockets/chat/chat.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { MessageType } from '@common/interfaces/message-type';
import { Subscription } from 'rxjs';
import { UserAccountService } from '@app/services/user-account/user-account/user-account.service';
import { TranslateModule, TranslateService } from "@ngx-translate/core";


@Component({
    selector: 'app-global-chat-box',
    standalone: true,
    imports: [ChatMessageComponent, CommonModule, FormsModule, TranslateModule],
    templateUrl: './global-chat-box.component.html',
    styleUrl: './global-chat-box.component.scss',
})
export class GlobalChatBoxComponent implements OnInit, AfterViewChecked, OnDestroy {
    @ViewChild('messageContainer') messageContainer: ElementRef<HTMLDivElement>;
    @Output() chatFocusChange = new EventEmitter<boolean>();

    messages: ChatMessage[] = [];
    newMessage: string = '';
    private messageSubscription: Subscription;
    private isAtBottom = true;
    private typingUsers = new Set<string>();
    currentTypingUser: string | null = null; 
    typingTimeout: any; 

    constructor(
        private chatService: ChatService,
        private socketService: SocketCommunicationService,
        private userAccountService: UserAccountService, 
        private translate: TranslateService
    ) {
        this.chatService.initTypingListeners();
    }

    async ngOnInit() {
        await this.socketService.connect();
        this.userAccountService.getEveryUser();
        this.loadGlobalMessages();
        
        this.messageSubscription = new Subscription();

        this.chatService.reloadGlobalMessages$.subscribe((reload) => {
            if (reload) {
            this.loadGlobalMessages();
            }
        });

        this.chatService.onMessageReceived((message: ChatMessage, type: MessageType) => {
            if (type !== MessageType.GLOBAL) return;
            if (this.isBlockedMessage(message)) return; 
            this.messages.push(message);
        });
        
        this.chatService.typingStatusChanged$.subscribe((payload) => {
            if (!payload) return;
            if (payload.type !== MessageType.GLOBAL) return;

            const uid = payload.uid;
            const isFriend = this.userAccountService.friends.some(f => f.uid === uid);
            if (!isFriend) return;

            const isTyping = this.chatService.isUserTyping(uid);

            if (isTyping) this.typingUsers.add(uid);
            else this.typingUsers.delete(uid);

            this.updateTypingIndicator();
        });
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    ngOnDestroy() {
        if (this.messageSubscription) {
            this.messageSubscription.unsubscribe();
        }
    }

    sendMessage() {
        if (this.newMessage.trim()) {
            this.chatService.sendMessage(this.newMessage, MessageType.GLOBAL);
            this.newMessage = '';
        }
    }

    onScroll() {
        const element = this.messageContainer.nativeElement;
        this.isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 1;
    }

    private loadGlobalMessages() {
        this.chatService.getGlobalMessages().subscribe((messages) => {
            this.messages = messages.filter((m) => {
            if (!m.senderUid) return true;

            const blocked = this.userAccountService.blockedUsers.some(
                (u) => u.uid === m.senderUid
            );
            const hasBlocked = this.userAccountService.isUserBlocked(m.senderUid);

            return !blocked && !hasBlocked;
            });
        });
    }


    private scrollToBottom() {
        if (this.messageContainer && this.isAtBottom) {
            this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
        }
    }

    private isBlockedMessage(msg: ChatMessage): boolean {
        if (!msg.senderUid) return false;

        const iBlockedThem = this.userAccountService.isUserBlocked(msg.senderUid);
        const theyBlockedMe = this.userAccountService.blockedUsers.some(u => u.uid === msg.senderUid);
        return iBlockedThem || theyBlockedMe;
    }

    onInputChange() {
        this.chatService.sendTyping('global', MessageType.GLOBAL); 
        clearTimeout(this.typingTimeout); 
        this.typingTimeout = setTimeout(() => {
            this.chatService.sendStopTyping('global', MessageType.GLOBAL);
        }, 1000);
    }
        
    onFocus() {
        this.chatFocusChange.emit(true);
    }

    onBlur() {
        this.chatFocusChange.emit(false);
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