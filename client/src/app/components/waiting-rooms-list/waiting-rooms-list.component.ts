import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CharacterCreatorComponent } from '@app/components/character-creator/character-creator.component';
import { WaitingRoom }from '@common/interfaces/waiting-room'
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { JoinGameService } from '@app/services/sockets/join-game/join-game.service';
import { ServerToClientEvent, ClientToServerEvent } from '@common/socket.events';
import { GameAvailability, GameStatus, Room } from '@common/interfaces/room';
import { Avatar, Player } from '@common/interfaces/player';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DoorClosed, DoorOpen, Globe, LucideAngularModule, Users, CircleDollarSign } from 'lucide-angular';
import { AvatarsPurchaseService } from '@app/services/user-account/avatars-purchase/avatars-purchase.service';
import { Game } from '@common/interfaces/game';

@Component({
  selector: "app-waiting-rooms-list",
  standalone: true,
  imports: [
    CommonModule,
    CharacterCreatorComponent,
    TranslateModule,
    LucideAngularModule,
  ],
  templateUrl: "./waiting-rooms-list.component.html",
  styleUrl: "./waiting-rooms-list.component.scss",
})
export class WaitingRoomsListComponent implements OnInit, OnDestroy {
  waitingRooms: WaitingRoom[] = [];
  isLoading = false;
  isCharacterFormVisible = false;
  availableAvatars: Avatar[] = [];
  userOwnedAvatars: Avatar[] = [];
  currentRoomId: string = "";
  selectedGame: Game | null = null;
  roomEntryFee: number = 0;

  public GameAvailability = GameAvailability;
  public GameStatus = GameStatus;
  readonly DoorOpen = DoorOpen;
  readonly DoorClosed = DoorClosed;
  readonly Globe = Globe;
  readonly Users = Users;
  readonly CircleDollarSign = CircleDollarSign;

  constructor(
    private socketCommunicationService: SocketCommunicationService,
    private joinGameService: JoinGameService,
    private avatarsPurchaseService: AvatarsPurchaseService,
    private translateService: TranslateService
  ) {}

  async ngOnInit(): Promise<void> {
    this.userOwnedAvatars = await this.avatarsPurchaseService.loadAvatars();
    this.setupWebSocketListeners();
    this.loadWaitingRooms();
  }

  private setupWebSocketListeners() {
    this.socketCommunicationService.on(
      ServerToClientEvent.WaitingRoomsUpdated,
      (rooms: WaitingRoom[]) => {
        // Diagnostic log for updates from server
        // eslint-disable-next-line no-console
        console.log("CLIENT UPDATE waiting-rooms:", {
          count: rooms?.length ?? 0,
          sampleIds: (rooms ?? []).slice(0, 5).map((r) => r.roomId),
        });
        this.waitingRooms = rooms;
        this.isLoading = false;
      }
    );

    this.socketCommunicationService.on(
      ServerToClientEvent.CharacterSelected,
      (serverAvatars: Avatar[]) => {
        this.availableAvatars = this.joinGameService.mergeAvatars(
          serverAvatars,
          this.userOwnedAvatars
        );
      }
    );
  }

  loadWaitingRooms() {
    this.isLoading = true;
    this.socketCommunicationService.send(
      ClientToServerEvent.GetWaitingRooms,
      null
    );

    setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
      }
    }, 3000);
  }

  joinRoom(room: WaitingRoom, isSpectator: boolean = false) {
    if (!room) return;
    this.joinGame(room.roomId, isSpectator);
  }
  private joinGame(accessCode: string, isSpectator: boolean = false) {
    this.joinGameService.handleJoinGame(
      accessCode,
      isSpectator,
      (roomInfo: Room | null, message: string) => {
        if (roomInfo) {
          if (isSpectator) {
            this.joinGameService.handleJoinLobbyAsSpectator();
          } else {
            this.isCharacterFormVisible = true;
            this.roomEntryFee = roomInfo.entryFee ?? 0;
            this.availableAvatars = this.joinGameService.mergeAvatars(
              roomInfo.availableAvatars,
              this.userOwnedAvatars
            );
            this.currentRoomId = roomInfo.roomId;
          }
        }
      }
    );
  }
  getAvailabilityText(availability: string): string {
    switch (availability) {
      case GameAvailability.Public:
        return this.translateService.instant("WAITING_ROOMS.PUBLIC");
      case GameAvailability.FriendsOnly:
        return this.translateService.instant("WAITING_ROOMS.FRIENDS_ONLY");
      case "private":
        return this.translateService.instant("WAITING_ROOMS.PRIVATE");
      default:
        return this.translateService.instant("WAITING_ROOMS.UNKNOWN");
    }
  }

  getAvailabilityClass(availability: string): string {
    switch (availability) {
      case GameAvailability.Public:
        return "availability-public";
      case GameAvailability.FriendsOnly:
        return "availability-friends";
      case "private":
        return "availability-private";
      default:
        return "availability-unknown";
    }
  }

  joinLobby(event: {player: Player; availability: GameAvailability}) {
    this.joinGameService.joinLobby(event.player);
  }

  selectedAvatar(avatar: Avatar) {
    this.socketCommunicationService.send(
      ClientToServerEvent.SelectCharacter,
      avatar
    );
  }

  leaveGame() {
    this.isCharacterFormVisible = false;
    this.socketCommunicationService.send(
      ClientToServerEvent.LeaveRoom,
      this.currentRoomId
    );
    this.currentRoomId = "";
  }

  ngOnDestroy() {
    this.socketCommunicationService.off(
      ServerToClientEvent.WaitingRoomsUpdated
    );
    this.socketCommunicationService.off(ServerToClientEvent.CharacterSelected);
  }
}
