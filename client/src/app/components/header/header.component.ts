import { CommonModule } from "@angular/common";
import { Component, Input, effect, signal, ViewChild } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { PathRoute } from "@common/interfaces/route";
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { ConfirmationDialogComponent } from "@app/components/confirmation-dialog/confirmation-dialog.component";
import { FriendsBarComponent } from "../friends/friends-bar/friends-bar.component";
import { SimpleDialogComponent } from "../simple-dialog/simple-dialog.component";
import { LucideAngularModule, Store, Settings, LogOut, Trophy } from "lucide-angular";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

@Component({
    selector: "app-header",
    standalone: true,
    imports: [
        CommonModule,
        MatMenuModule,
        MatIconModule,
        FriendsBarComponent,
        LucideAngularModule,
        RouterLink,
        TranslateModule,
    ],
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
})
export class HeaderComponent {
    @Input() title: string = "";
    @Input() hasOnlyChat?: boolean = false;
    @Input() isHeaderHidden?: boolean = false;
    @ViewChild("friendsBar") friendsBar!: FriendsBarComponent;

    readonly Trophy = Trophy;
    readonly Store = Store;
    readonly Settings = Settings;
    readonly LogOut = LogOut;

    photoURL = () =>
        this.accountDetails?.avatarURL || "./assets/images/icones/missing-avatar.png";

    username = () => this.accountDetails?.username || "John Smith";

    balance = () => this.accountDetails?.balance ?? -1;

    menuOpen = signal(false);
    friendsBarOpen = false;
    friendsBarActiveTab: "friends" | "chatRooms" = "friends";

    constructor(
        private dialog: MatDialog,
        private userAccountService: UserAccountService,
        private router: Router,
        private translateService: TranslateService
    ) {
        effect(() => {
            const user = this.userAccountService.accountDetails();
            if (!user) {
                this.router.navigate([PathRoute.SignIn]);
            }
        });
    }

    get accountDetails() {
        return this.userAccountService.accountDetails();
    }

    async deleteUserAccount() {
        this.dialog.open(ConfirmationDialogComponent, {
            data: {
                title: this.translateService.instant("USER.DELETE"),
                message: this.translateService.instant("USER.DELETE_MESSAGE"),
                onAgreed: await this.userAccountService.deleteUserAccount.bind(
                    this.userAccountService
                ),
            },
        });
    }

    toggleMenu() {
        this.menuOpen.set(!this.menuOpen());
    }

    toggleFriends() {
        if (this.friendsBarOpen && this.friendsBarActiveTab === "friends") {
            this.friendsBarOpen = false;
        } else {
            this.friendsBarOpen = true;
            this.friendsBarActiveTab = "friends";
        }
    }

    toggleChat() {
        if (this.friendsBarOpen && this.friendsBarActiveTab === "chatRooms") {
            this.friendsBarOpen = false;
            return;
        }

        this.friendsBarOpen = true;
        this.friendsBarActiveTab = "chatRooms";

        setTimeout(() => {
            this.friendsBar.forceSelectChannel({
                roomId: "general",
                name: "General",
                ownerId: "system",
                members: [],
                isActive: true,
                lastActivity: new Date(),
                type: "global"
            });


            this.friendsBar.forceHighlightGeneral();
        });
    }

    onTabChanged(tab: "friends" | "chatRooms") {
        this.friendsBarActiveTab = tab;
    }

    onBarClosed() {
        this.friendsBarOpen = false;
    }

    async signOut() {
        const dialogRef = this.dialog.open(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: this.translateService.instant("USER.LOG_OUT"),
                messages: [
                    this.translateService.instant("USER.LOG_OUT_MESSAGE"),
                ],
                options: [
                    this.translateService.instant("USER.LOG_OUT_CANCEL"),
                    this.translateService.instant("USER.LOG_OUT_CONFIRM"),
                ],
                confirm: true,
            },
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result.action === "right") {
                await this.userAccountService.signOut();
                this.menuOpen.set(false);
            }
        });
    }
}
