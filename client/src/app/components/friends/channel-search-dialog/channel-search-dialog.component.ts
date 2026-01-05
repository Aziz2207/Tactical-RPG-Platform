import { Component, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { LucideAngularModule, X, Search, Plus } from "lucide-angular";
import { PrivateRoomService, PrivateRoom } from "@app/services/sockets/private-room/private-room.service";
import { UserAccountService } from "@app/services/user-account/user-account/user-account.service";

type Account = { id?: string; _id?: string; uid?: string; username?: string };
import { TranslateModule } from "@ngx-translate/core";

@Component({
    selector: "app-channel-search-dialog",
    standalone: true,
    imports: [LucideAngularModule, TranslateModule],
    templateUrl: "./channel-search-dialog.component.html",
    styleUrl: "./channel-search-dialog.component.scss",
})
export class ChannelSearchDialogComponent implements OnInit {
  readonly X = X;
  readonly Search = Search;
  readonly Plus = Plus;

  allChannels: PrivateRoom[] = [];
  filteredChannels: PrivateRoom[] = [];
  searchTerm: string = "";

  private currentUserId: string | null = null;
  private currentUserName: string | null = null;

  private joinedRoomIds = new Set<string>();

  private onRoomCreatedHandler = (room: PrivateRoom) => {
    if (!room) return;

    const mine = this.currentUserId;
    if (!mine) return;
    if (room.isActive === false) return;

    const isOwner = room.ownerId === mine;
    const isMember = !!room.members?.some((m) => m.userId === mine);
    const alreadyExists = this.allChannels.some((r) => r.roomId === room.roomId);

    if (!isOwner && !isMember && !alreadyExists) {
      this.allChannels.unshift(room);
      this.filterChannels();
      console.log(`[Socket] Nouveau canal ajouté : ${room.name}`);
    }
  };

  private onRoomDeletedHandler = (data: { roomId: string }) => {
    if (!data?.roomId) return;
    this.allChannels = this.allChannels.filter((c) => c.roomId !== data.roomId);
    this.filterChannels();
    console.log(`[Socket] Canal supprimé : ${data.roomId}`);
  };

  constructor(
    private dialogRef: MatDialogRef<ChannelSearchDialogComponent>,
    private privateRoomService: PrivateRoomService,
    private userAccountService: UserAccountService
  ) {}

  ngOnInit() {
    const acc = this.userAccountService.accountDetails() as Account | null;
    if (acc) {
      this.currentUserId = acc.id ?? acc._id ?? acc.uid ?? null;
      this.currentUserName = acc.username ?? null;
    }

    if (!this.currentUserId) return;

    this.privateRoomService.getAllAvailableRooms(this.currentUserId).subscribe({
      next: (rooms) => {
        const mine = this.currentUserId!;
        const available = (rooms ?? []).filter((r) => {
          if (!r) return false;
          if (r.roomId === "general") return false;
          if (r.isActive === false) return false;
          const iAmOwner = r.ownerId === mine;
          const iAmMember = !!r.members?.some((m) => m.userId === mine);
          return !iAmOwner && !iAmMember;
        });

        const unique = available.filter(
          (room, idx, self) =>
            idx === self.findIndex((x) => x.roomId === room.roomId)
        );

        this.allChannels = unique;
        this.filteredChannels = unique;
      },
      error: (err) =>
        console.error("[ChannelSearchDialog] Erreur chargement canaux", err),
    });

    this.privateRoomService.onRoomCreated(this.onRoomCreatedHandler);
    this.privateRoomService.onRoomDeleted(this.onRoomDeletedHandler);
  }

  ngOnDestroy() {
    this.privateRoomService.offRoomCreated(this.onRoomCreatedHandler);
    this.privateRoomService.offRoomDeleted(this.onRoomDeletedHandler);
  }


  closeDialog() {
    this.dialogRef.close();
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.searchTerm = value;
    this.filterChannels();
  }

  private filterChannels() {
    const term = this.searchTerm.toLowerCase();
    this.filteredChannels = !term
      ? this.allChannels
      : this.allChannels.filter((c) => c.name?.toLowerCase().includes(term));
  }

  canJoin(channel: PrivateRoom): boolean {
    if (!this.currentUserId) return false;
    const isOwner = channel.ownerId === this.currentUserId;
    const alreadyJoined =
      this.joinedRoomIds.has(channel.roomId) ||
      !!channel.members?.some((m) => m.userId === this.currentUserId);

    return !isOwner && !alreadyJoined;
  }


  joinChannel(channel: PrivateRoom) {
    if (!this.currentUserId) return;
    const username = this.currentUserName ?? "Unknown";

    this.privateRoomService.joinRoom(channel.roomId, this.currentUserId, username).subscribe({
      next: (joinedRoom) => {
        this.joinedRoomIds.add(channel.roomId);
        this.dialogRef.close(joinedRoom);
      },
      error: (err) => {
        console.error("[ChannelSearchDialog] Erreur join", err);
        this.dialogRef.close(null);
      },
    });
  }
}
