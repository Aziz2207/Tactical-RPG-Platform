import { CommonModule } from "@angular/common";
import {
    Component,
    ElementRef,
    HostListener,
    ViewChild,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
} from "@angular/core";
import { UserListComponent } from "../user-list/user-list.component";
import { UserSearchDialogComponent } from "../user-search-dialog/user-search-dialog.component";
import { LucideAngularModule, Search, X } from "lucide-angular";
import { ChannelListComponent } from "../channel-list/channel-list.component";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { GlobalChatBoxComponent } from "@app/components/global-chat-box/global-chat-box.component";
import { UserAccount } from "@common/interfaces/user-account";
import { Subscription } from "rxjs";
import { FormsModule } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { PrivateRoom } from "@app/services/sockets/private-room/private-room.service";
import { ChatBoxComponent } from "@app/components/chat-box/chat-box.component";
import { PrivateChatBoxComponent } from "@app/components/private-chat-box/private-chat-box.component";
import { ChatService } from "@app/services/sockets/chat/chat.service";

export enum UserListType {
    Friends = "friends",
    SearchResults = "searchResults",
    IncomingRequests = "incomingRequests",
    BlockedUsers = "blockedUsers",
    None = "None",
}

@Component({
    selector: "app-friends-bar",
    standalone: true,
    imports: [
        FormsModule,
        CommonModule,
        UserListComponent,
        UserSearchDialogComponent,
        LucideAngularModule,
        ChannelListComponent,
        GlobalChatBoxComponent,
        TranslateModule,
        ChatBoxComponent, 
        PrivateChatBoxComponent,
    ],
    templateUrl: "./friends-bar.component.html",
    styleUrls: ["./friends-bar.component.scss"],
})
export class FriendsBarComponent implements OnInit, OnDestroy {
    @Input() isOpen = false;
    @Input() activeTab: "friends" | "chatRooms" = "friends";
    @Input() hasChatOnly?: boolean = false;
    @Output() tabChanged = new EventEmitter<"friends" | "chatRooms">();
    @Output() barClosed = new EventEmitter<void>();
    

    @ViewChild("dialogContainer", { static: false })
    dialogContainer!: ElementRef;

    @ViewChild(ChannelListComponent) channelList!: ChannelListComponent;

    isSearchDialogOpen = false;
    isBlockedDialogOpen = false;
    isSpectator = false;
    currentRoomId: string | null = null;

    selectedChannel: PrivateRoom | null = null;
    openDialogType: UserListType = UserListType.None;

    readonly Search = Search;
    readonly X = X;
    readonly UserListType = UserListType;

    private searchTimeout: any;
    private currentSearchTerm = '';
    private cachedUsers: UserAccount[] = [];
    private sentFriendRequests: Set<string> = new Set();


    get users(): UserAccount[] {
        const friendIds = this.friends.map((f) => f.uid);
        const requestIds = this.friendRequests.map((r) => r.uid);
        const blockedIds = this.blockedUsers.map((b) => b.uid);
        const selfId = this.userAccountService.accountDetails().uid;

        let filteredUsers = this.cachedUsers.filter(
          (user) =>
            !friendIds.includes(user.uid) &&
            !requestIds.includes(user.uid) &&
            !blockedIds.includes(user.uid) &&
            !user.uid !== selfId &&
            !this.sentFriendRequests.has(user.uid)
        );

        if (this.currentSearchTerm.trim()) {
            const term = this.currentSearchTerm.toLowerCase();
            filteredUsers = filteredUsers.filter(user => 
                (user.username && user.username.toLowerCase().includes(term))
            );
        }

        return filteredUsers;
    }

    get friends(): UserAccount[] {
        return this.userAccountService.friends;
    }

    get friendRequests(): UserAccount[] {
        return this.userAccountService.friendRequests;
    }

    get searchResults(): UserAccount[] {
        return this.users;
    }

    get onlineFriends(): UserAccount[] {
        return this.userAccountService.onlineFriends;
    }

    get blockedUsers(): UserAccount[] {
        return this.userAccountService.blockedUsers;
    }

    get displayedUsers(): UserAccount[] {
        switch (this.openDialogType) {
            case UserListType.Friends:
                return this.friends;
            case UserListType.SearchResults:
                return this.searchResults;
            case UserListType.IncomingRequests:
                return this.friendRequests;
            case UserListType.BlockedUsers:
                return this.blockedUsers;
            default:
                return [];
        }
    }

    private subscriptions: Subscription[] = [];
    private socketInitialized = false;
    
    constructor(
        private elRef: ElementRef,
        private userAccountService: UserAccountService,
        private snackBar: MatSnackBar,
        private translate: TranslateService,
        private chatService: ChatService,
    ) {}

    async ngOnInit() {
        this.setupNotificationListeners();
        this.setupDataUpdateListeners();
        this.userAccountService.refreshOnlineFriends();
    }

    ngOnChanges() {
        if (this.isOpen && !this.socketInitialized) {
            this.initializeSocketConnection();
        }
        this.updateContentMargin();
    }

    private initializeSocketConnection() {
        this.userAccountService.initializeAndLoadData();
        this.socketInitialized = true;
    }

    ngOnDestroy() {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        this.userAccountService.removeSocketListeners();
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }

    private setupDataUpdateListeners() {
        this.subscriptions.push(
            this.userAccountService.allUsers$.subscribe((users) => {
                this.cachedUsers = [...users];
            })
        );

        this.subscriptions.push(
            this.userAccountService.friends$.subscribe(() => {
            })
        );

        this.subscriptions.push(
            this.userAccountService.friendRequests$.subscribe(() => {

            })
        );

        this.subscriptions.push(
            this.userAccountService.friendRequestSent$.subscribe((data: { receiverUid: string }) => {
                this.sentFriendRequests.add(data.receiverUid);
            })
        );

        this.subscriptions.push(
            this.userAccountService.friendRequestAccepted$.subscribe((data) => {
                this.sentFriendRequests.delete(data.accepterInfo.uid);
            })
        );

        this.subscriptions.push(
            this.userAccountService.friendRequestRejected$.subscribe((data: { requesterUid: string, result: any }) => {
                this.sentFriendRequests.delete(data.requesterUid);
            })
        );

        this.subscriptions.push(
          this.userAccountService.friendRequestRejectedByUser$.subscribe(
            (data: {rejecterUid: string}) => {
              this.sentFriendRequests.delete(data.rejecterUid);
            }
          )
        );

        this.subscriptions.push(
            this.userAccountService.blockedUsers$.subscribe((users) => {
            })
        );

        this.subscriptions.push(
            this.userAccountService.userBlocked$.subscribe((data) => {
                this.snackBar.open(this.translate.instant('FRIENDS.BLOCK_SUCCESS'), this.translate.instant('FRIENDS.CLOSE'), {
                    duration: 1500,
                });
            })
        );

        this.subscriptions.push(
            this.userAccountService.userUnblocked$.subscribe((data) => {
                this.snackBar.open(this.translate.instant('FRIENDS.UNBLOCK_SUCCESS'), this.translate.instant('FRIENDS.CLOSE'), {
                    duration: 1500,
                });
            })
        );

        this.subscriptions.push(
            this.userAccountService.blockedByUser$.subscribe((data) => {
                this.snackBar.open(this.translate.instant('FRIENDS.BLOCKED_MESSAGE'), this.translate.instant('FRIENDS.CLOSE'), {
                    duration: 1500,
                });
            })
        );
    }

    private setupNotificationListeners() {
        this.subscriptions.push(
            this.userAccountService.friendRequestReceived$.subscribe((data) => {
                this.snackBar.open(
                    this.translate.instant('FRIENDS.NOTIF_REQUEST_RECEIVED', { username: data.senderInfo.username }),
                    this.translate.instant('FRIENDS.CLOSE'),
                    { duration: 1500 }
                );
            })
        );

        this.subscriptions.push(
            this.userAccountService.friendRequestAccepted$.subscribe((data) => {
                this.snackBar.open(
                    this.translate.instant('FRIENDS.NOTIF_REQUEST_ACCEPTED', { username: data.accepterInfo.username }),
                    this.translate.instant('FRIENDS.CLOSE'),
                    { duration: 1500 }
                );
            })
        );

        this.subscriptions.push(
            this.userAccountService.friendRemoved$.subscribe((data) => {
                this.snackBar.open(
                    this.translate.instant('FRIENDS.NOTIF_REMOVED', { username: data.removedByInfo.username }),
                    this.translate.instant('FRIENDS.CLOSE'),
                    { duration: 1500 }
                );
            })
        );
    }

    searchUsers(searchTerm: string) {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            this.currentSearchTerm = searchTerm.trim();
        }, 300);
    }

    setActiveTab(tab: "friends" | "chatRooms") {
        this.activeTab = tab;
        this.tabChanged.emit(tab);

        if (tab === "friends") {
            this.selectedChannel = null;
        } else if (tab === "chatRooms") {
            const generalChannel: PrivateRoom = {
            roomId: "general",
            name: "General",
            ownerId: "system",
            members: [],
            isActive: true,
            lastActivity: new Date(),
            };

            this.forceSelectChannel(generalChannel);
            setTimeout(() => this.forceHighlightGeneral(), 100);


            this.chatService.triggerReloadGlobalMessages();
        }

        this.updateContentMargin();
        }

        reloadGeneralMessages() {
            const general = {
                roomId: "general",
                name: "General",
                ownerId: "system",
                members: [],
                isActive: true,
                lastActivity: new Date(),
            };

            if (this.selectedChannel?.roomId === "general") {
                this.forceSelectChannel(general);
                this.forceHighlightGeneral();
            }
        }

    closeSidebar() {
        this.barClosed.emit();
        this.selectedChannel = null;
        this.updateContentMargin();
    }

    openSearchDialog() {
        this.openDialogType = UserListType.SearchResults;
        this.isSearchDialogOpen = true;
    }

    openFriendRequestsDialog() {
        this.openDialogType = UserListType.IncomingRequests;
        this.isSearchDialogOpen = true;
    }

    closeSearchDialog() {
        this.isSearchDialogOpen = false;
        this.openDialogType = UserListType.None;
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.currentSearchTerm = '';
    }

    openBlockedUsersDialog() {
        this.openDialogType = UserListType.BlockedUsers;
        this.isBlockedDialogOpen = true;
    }

    closeBlockedDialog() {
        this.isBlockedDialogOpen = false;
        this.openDialogType = UserListType.None;
    }

    onChannelSelected(channel: PrivateRoom) {
        if (channel.roomId?.startsWith('private_')) channel.type = 'private';
        else if (channel.roomId === 'general') channel.type = 'global';
        else channel.type = 'room';

        this.selectedChannel = channel;
        this.updateContentMargin();
    }

    get hasFriendRequests(): boolean {
        return this.friendRequests.length > 0;
    }

    get friendRequestCount(): number {
        return this.friendRequests.length;
    }

    get onlineFriendCount(): number {
        return this.onlineFriends.length;
    }

    @HostListener("document:click", ["$event"])
    onClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;

        const clickedInside = this.elRef.nativeElement.contains(target);
        const clickedHeaderButton =
            target.closest(".friends-button") || target.closest(".chat-button");

        if (!clickedInside && !clickedHeaderButton) {
            if (this.isOpen || this.selectedChannel) {
                this.barClosed.emit();
                this.selectedChannel = null;
                this.updateContentMargin();
            }
        }
    }

    private updateContentMargin() {
        document.body.classList.remove('friends-open', 'chat-open', 'both-open');

        if (this.isOpen && this.selectedChannel) {
            document.body.classList.add('both-open');
        } else if (this.isOpen) {
            document.body.classList.add('friends-open');
        } else if (this.selectedChannel && this.isOpen) {
            document.body.classList.add('chat-open');
        }
    }


    closeChat(){
        this.selectedChannel = null;
        this.updateContentMargin();
    }

    forceSelectChannel(channel: PrivateRoom) {
        this.selectedChannel = channel;
        this.updateContentMargin();

        if (channel.roomId === "general") {
            const event = new CustomEvent("loadGlobalMessages");
            window.dispatchEvent(event);
        }
        }

    forceHighlightGeneral() {
        if (this.channelList) {
            this.channelList.selectChannelProgrammatically("general");
        }
    }

}

