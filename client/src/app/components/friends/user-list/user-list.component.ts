import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { UserListType } from "../friends-bar/friends-bar.component";
import {
    LucideAngularModule,
    UserRoundPlus,
    UserRoundMinus,
    Ban,
    Check,
    X,
} from "lucide-angular";
import { MatDialog } from "@angular/material/dialog";
import { SimpleDialogComponent } from "@app/components/simple-dialog/simple-dialog.component";
import { UserAccount } from "@common/interfaces/user-account";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

@Component({
    selector: "app-user-list",
    standalone: true,
    imports: [LucideAngularModule, TranslateModule],
    templateUrl: "./user-list.component.html",
    styleUrl: "./user-list.component.scss",
})
export class UserListComponent implements OnInit, OnDestroy {
    @Input() users: UserAccount[] = [];
    @Input() userListType: UserListType;

    constructor(
        private dialog: MatDialog,
        private userAccountService: UserAccountService,
        private translate: TranslateService
    ) {}

    readonly UserRoundPlus = UserRoundPlus;
    readonly UserRoundMinus = UserRoundMinus;
    readonly Ban = Ban;
    readonly Check = Check;
    readonly X = X;

    ngOnInit() {
        this.userAccountService.initSocketListeners();
        this.userAccountService.loadInitialData();
    }

    ngOnDestroy() {
        // this.userAccountService.removeSocketListeners();
    }

    unfriendPlayer(user: UserAccount) {
        const dialogRef = this.dialog.open(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: this.translate.instant("FRIENDS.REMOVE_FRIEND_TITLE"),
                messages: [
                    this.translate.instant("FRIENDS.REMOVE_FRIEND_MESSAGE", {
                        username: user.username,
                    }),
                ],
                options: [
                    this.translate.instant("FRIENDS.REMOVE_FRIEND_CANCEL"),
                    this.translate.instant("FRIENDS.REMOVE_FRIEND_CONFIRM"),
                ],
                confirm: true,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result.action === "right") {
                this.userAccountService.removeFriend(user.uid);
            }
        });
    }

    blockPlayer(isFriend: boolean, user: UserAccount) {
        const messageKey = isFriend
            ? "FRIENDS.BLOCK_USER_MESSAGE_FRIEND"
            : "FRIENDS.BLOCK_USER_MESSAGE_OTHER";

        const dialogRef = this.dialog.open(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: this.translate.instant("FRIENDS.BLOCK_USER_TITLE"),
                messages: [
                    this.translate.instant(messageKey, {
                        username: user.username,
                    }),
                ],
                options: [
                    this.translate.instant("FRIENDS.BLOCK_USER_CANCEL"),
                    this.translate.instant("FRIENDS.BLOCK_USER_CONFIRM"),
                ],
                confirm: true,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result.action === "right") {
                this.userAccountService.blockUser(user.uid);
                console.log(`User ${user.username} blocked`);
            }
        });
    }

    unblockPlayer(user: UserAccount) {
        const dialogRef = this.dialog.open(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title:  this.translate.instant('DIALOG.TITLE.UNBLOCK_USER'),
                messages: [this.translate.instant('DIALOG.MESSAGE.UNBLOCK_USER', {username: user.username })],
                options: [this.translate.instant('DIALOG.CANCEL'), this.translate.instant('FRIENDS.UNBLOCK')],
                confirm: true,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result.action === "right") {
                this.userAccountService.unblockUser(user.uid);
                console.log(`User ${user.username} unblocked`);
            }
        });
    }

    isUserFriend(user: UserAccount): boolean {
        return this.userAccountService.friends.some(friend => friend.uid === user.uid);
    }

    sendFriendRequest(user: UserAccount) {
        this.userAccountService.sendFriendRequest(user.uid);
    }

    acceptFriendRequest(user: UserAccount) {
        const dialogRef = this.dialog.open(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: this.translate.instant("FRIENDS.FRIEND_REQUEST_ACCEPTED_TITLE"),
                messages: [
                    this.translate.instant("FRIENDS.FRIEND_REQUEST_ACCEPTED_MESSAGE", {
                        username: user.username,
                    }),
                ],
                options: [this.translate.instant("FRIENDS.CLOSE")],
                confirm: false,
            },
        });

        dialogRef.afterClosed().subscribe(() => {
            this.userAccountService.acceptFriendRequest(user.uid);
            // console.log(`Friend request accepted for ${user.username}`);
        });
    }

    rejectFriendRequest(user: UserAccount) {
        const dialogRef = this.dialog.open(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: this.translate.instant("FRIENDS.FRIEND_REQUEST_REJECTED_TITLE"),
                messages: [
                    this.translate.instant("FRIENDS.FRIEND_REQUEST_REJECTED_MESSAGE", {
                        username: user.username,
                    }),
                ],
                options: [this.translate.instant("FRIENDS.CLOSE")],
                confirm: false,
            },
        });

        dialogRef.afterClosed().subscribe(() => {
            this.userAccountService.rejectFriendRequest(user.uid);
            // console.log(`Friend request rejected for ${user.username}`);
        });
    }

    openFriendRequestDialog(user: UserAccount) {
        const dialogRef = this.dialog.open(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: this.translate.instant("FRIENDS.FRIEND_REQUEST_SENT_TITLE"),
                messages: [
                    this.translate.instant("FRIENDS.FRIEND_REQUEST_SENT_MESSAGE", {
                        username: user.username,
                    }),
                ],
                options: [this.translate.instant("FRIENDS.CLOSE")],
                confirm: false,
            },
        });

        dialogRef.afterClosed().subscribe(async () => {
            await this.sendFriendRequest(user);
        });
    }

    shouldShowAddFriendButton(user: UserAccount): boolean {
        return this.userListType === UserListType.SearchResults;
    }

    shouldShowAcceptRejectButtons(user: UserAccount): boolean {
        return this.userListType === UserListType.IncomingRequests;
    }

    shouldShowRemoveFriendButton(user: UserAccount): boolean {
        return this.userListType === UserListType.Friends;
    }

    isUserOnline(user: UserAccount): boolean {
        return this.userAccountService.isUserOnline(user);
    }
}
