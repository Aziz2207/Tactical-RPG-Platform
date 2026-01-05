import { Component, EventEmitter, Output, ViewChild, ElementRef, AfterViewChecked } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
    LucideAngularModule,
    Plus,
    Search,
    X,
    Check,
    LogOut,
    Trash2,
} from "lucide-angular";
import { MatDialog } from "@angular/material/dialog";
import { SimpleDialogComponent } from "@app/components/simple-dialog/simple-dialog.component";
import { ChannelSearchDialogComponent } from "../channel-search-dialog/channel-search-dialog.component";
import { PrivateRoomService, PrivateRoom} from "@app/services/sockets/private-room/private-room.service"
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
type Account = { id?: string; _id?: string; uid?: string; username?: string };

@Component({
    selector: "app-channel-list",
    standalone: true,
    imports: [LucideAngularModule, FormsModule, TranslateModule],
    templateUrl: "./channel-list.component.html",
    styleUrl: "./channel-list.component.scss",
})
export class ChannelListComponent implements AfterViewChecked {
    @Output() channelSelected = new EventEmitter<PrivateRoom>();
    @ViewChild('channelInput') channelInput?: ElementRef<HTMLInputElement>;

    constructor(private dialog: MatDialog,
        private privateRoomService: PrivateRoomService,
        private userAccountService: UserAccountService,
        private translate: TranslateService,
    ) {}
    readonly Plus = Plus;
    readonly Search = Search;
    readonly X = X;
    readonly Check = Check;
    readonly LogOut = LogOut;
    readonly Trash2 = Trash2;

    channels: PrivateRoom[] = [];
    errorMessage: string | null = null;
    selectedChannelId: string | null = null;
    creatingChannel = false;
    newChannelName = "";
    private shouldFocusInput = false;
    private currentUserId: string | null = null;
    private currentUsername: string | null = null;
    private newOwnerHandler = (data: any) => {
        if (!data || !data.roomId || !data.newOwnerId) return;

        const room = this.channels.find(c => c.roomId === data.roomId);
        if (room) {
            room.ownerId = data.newOwnerId;
        }

        if (data.newOwnerId === this.currentUserId) {
            this.dialog.open(SimpleDialogComponent, {
                disableClose: true,
                data: {
                    title: this.translate.instant('CHANNEL_LIST.OWNER_CHANGE_TITLE'),
                    messages: [
                        this.translate.instant('CHANNEL_LIST.OWNER_CHANGE_MESSAGE', {
                            name: data.roomName ?? data.roomId
                        }),
                    ],
                    options: ['OK'],
                    confirm: false,
                },
            });
        }
    };

    private roomDeletedHandler = (data: { roomId: string; roomName?: string; deletedBy?: string }) => {
        if (!data?.roomId) return;

        if (data.deletedBy && this.currentUserId === data.deletedBy) {
        return;
        }

        this.channels = this.channels.filter(c => c.roomId !== data.roomId);

        if (this.selectedChannelId === data.roomId) {
        this.selectedChannelId = null;
        }

        this.dialog.open(SimpleDialogComponent, {
        disableClose: true,
        data: {
            title: this.translate.instant('CHANNEL_LIST.DELETED_BY_OWNER_TITLE'),
            messages: [
            this.translate.instant('CHANNEL_LIST.DELETED_BY_OWNER_MESSAGE', {
                name: data.roomName ?? data.roomId
            }),
            ],
            options: ['OK'],
            confirm: false,
        },
        });
    };

    ngOnInit() {
        const acc = this.userAccountService.accountDetails() as Account | null;
        if (acc) {
            this.currentUserId = acc.id ?? acc._id ?? acc.uid ?? null;
            this.currentUsername = acc.username ?? null;
        }

        if (this.currentUserId) {
            this.privateRoomService.onNewOwnerAssigned(this.newOwnerHandler);
        }

        this.privateRoomService.onRoomDeleted(this.roomDeletedHandler);

        this.channels = [
            { roomId: 'general', name: 'General', ownerId: 'system' } as PrivateRoom,
        ];

        if (this.currentUserId) {
            this.privateRoomService.getUserRooms(this.currentUserId).subscribe({
            next: (rooms: PrivateRoom[]) => {
                this.channels = [
                this.channels[0],
                ...rooms.filter((r) => r.roomId !== 'general'),
                ];
            },
            error: (err: unknown) => console.error('Erreur de chargement des salles', err),
            });
        }
        }

    onInputChange() { 
        this.errorMessage = null;
    }

    selectChannel(channel: PrivateRoom) {
        this.selectedChannelId = channel.roomId;
        this.channelSelected.emit(channel);
    }

    selectChannelProgrammatically(roomId: string) {
        this.selectedChannelId = roomId;

        const channel = this.channels.find(c => c.roomId === roomId);
        if (channel) {
            this.channelSelected.emit(channel);
        }
    }

    startCreating() {
        this.creatingChannel = true;
        this.newChannelName = "";
        this.shouldFocusInput = true;
    }

    cancelCreating() {
        this.creatingChannel = false;
        this.newChannelName = "";
        this.shouldFocusInput = false;
        this.errorMessage = null;
    }

    confirmCreating() {
        if (!this.newChannelName.trim() || !this.currentUserId || !this.currentUsername) return;

        const MAX_NAME_LENGTH = 20;

        if (this.newChannelName.length > MAX_NAME_LENGTH) {
            this.openErrorDialog(this.translate.instant('CHANNEL_LIST.NAME_TOO_LONG', { max: MAX_NAME_LENGTH }));
            return;
        }

        const normalize = (name: string) => name.replace(/\s+/g, '').toLowerCase();
        const normalizedNewName = normalize(this.newChannelName.trim());

        const exists = this.channels.some(
            c => normalize(c.name) === normalizedNewName
        );

        if (exists) {
            this.openErrorDialog(this.translate.instant('CHANNEL_LIST.ALREADY_EXISTS', {
                name: this.newChannelName
            }));
            return;
        }

        this.privateRoomService
            .createRoom(this.newChannelName.trim(), this.currentUserId, this.currentUsername)
            .subscribe({
                next: (newRoom: PrivateRoom) => {
                    this.channels.splice(1, 0, newRoom);
                    this.cancelCreating();
                },
                error: (err: unknown) => {
                    console.error("Erreur de création du canal", err);

                    if (err instanceof Error && err.message.includes("existe deja")) {
                        this.openErrorDialog(this.translate.instant('CHANNEL_LIST.ALREADY_EXISTS', {
                            name: this.newChannelName
                        }));
                    } else {
                        this.openErrorDialog(this.translate.instant('CHANNEL_LIST.ALREADY_EXISTS', {
                            name: this.newChannelName
                        }));
                    }
                },
            });
    }

    ngAfterViewChecked() {
        if (this.shouldFocusInput && this.channelInput) {
            this.channelInput.nativeElement.focus();
            this.shouldFocusInput = false;
        }
    }

    deleteChannel(channelName: string, event: Event) {
        event.stopPropagation();
        const dialogRef = this.dialog.open(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: this.translate.instant('CHANNEL_LIST.DELETE_TITLE'),
                messages: [this.translate.instant('CHANNEL_LIST.DELETE_MESSAGE', { name: channelName })],
                options: [this.translate.instant('DIALOG.CANCEL'), this.translate.instant('CHANNEL_LIST.DELETE_TITLE')],
                confirm: true,
            },
        });

        dialogRef.afterClosed().subscribe((result: { action: "left" | "right" | "close" }) => {
            if (result?.action === "right") {
                const channel = this.channels.find((c) => c.name === channelName);
                if (!channel || !this.currentUserId) return;

                this.privateRoomService.deleteRoom(channel.roomId, this.currentUserId).subscribe({
                    next: () => {
                        this.channels = this.channels.filter((c) => c.roomId !== channel.roomId);

                        if (this.selectedChannelId === channel.roomId) {
                            this.selectedChannelId = "general";
                            const generalChannel = this.channels.find(c => c.roomId === "general");
                            if (generalChannel) {
                                this.channelSelected.emit(generalChannel);
                            }
                        }
                    },
                    error: (err: unknown) => console.error("Erreur suppression canal", err),
                });
            }
        });
    }

    leaveChannel(channelName: string, event: Event) {
        event.stopPropagation();
        const dialogRef = this.dialog.open(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: this.translate.instant('CHANNEL_LIST.LEAVE_TITLE'),
                messages: [this.translate.instant('CHANNEL_LIST.LEAVE_MESSAGE', { name: channelName })],
                options: [this.translate.instant('DIALOG.CANCEL'), this.translate.instant('CHANNEL_LIST.LEAVE_TITLE')],
                confirm: true,
            },
        });

        dialogRef.afterClosed().subscribe((result: { action: "left" | "right" | "close" }) => {
            if (result?.action === "right") {
                const channel = this.channels.find((c) => c.name === channelName);
                if (!channel || !this.currentUserId) return;

                this.privateRoomService.leaveRoom(channel.roomId, this.currentUserId).subscribe({
                    next: () => {
                        this.channels = this.channels.filter((c) => c.roomId !== channel.roomId);

                        if (this.selectedChannelId === channel.roomId) {
                            this.selectedChannelId = "general";
                            const generalChannel = this.channels.find(c => c.roomId === "general");
                            if (generalChannel) {
                                this.channelSelected.emit(generalChannel);
                            }
                        }
                    },
                    error: (err: unknown) => console.error("Erreur quitter canal", err),
                });
            }
        });
    }

    openChannelSearchDialog() {
        const dialogRef = this.dialog.open(ChannelSearchDialogComponent, {
            disableClose: true,
            panelClass: "custom-dialog-container",
        });

        dialogRef.afterClosed().subscribe((joinedRoom: PrivateRoom | null) => {
            if (joinedRoom && this.currentUserId) {
                const exists = this.channels.some(r => r.roomId === joinedRoom.roomId);
                if (!exists) {
                    this.channels.push(joinedRoom);
                }
            }
        })
    }

    canLeave(channel: PrivateRoom): boolean {
        if (!this.currentUserId) return false;

        if (channel.roomId === "general") return false;

        const isMember = channel.members?.some(m => m.userId === this.currentUserId);
        const isOwner = channel.ownerId === this.currentUserId;

        return isMember || isOwner;
    }

    canDelete(channel: PrivateRoom): boolean {
        return this.currentUserId !== null && channel.ownerId === this.currentUserId;
    }

        private openErrorDialog(message: string): void {
        this.dialog.open(SimpleDialogComponent, {
            disableClose: true,
            data: {
                title: this.translate.instant('CHANNEL_LIST.CREATE_ERROR_TITLE'),
                messages: [message],
                options: [this.translate.instant('DIALOG.CLOSE')],
                confirm: false,
            },
        });
    }

    ngOnDestroy() {
        this.privateRoomService.offNewOwnerAssigned(this.newOwnerHandler);
        this.privateRoomService.offRoomDeleted(this.roomDeletedHandler);
    }
}
