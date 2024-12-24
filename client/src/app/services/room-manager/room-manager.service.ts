import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '@app/services/socket/socket.service';
import { CONSTANTS } from '@common/constants';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { GameSessionEvents } from '@common/event-enums/gameSession.gateway.events';
import { Attributes } from '@common/interfaces/attributes';
import { Item } from '@common/interfaces/item';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class RoomManagerService {
    roomLockedSubject = new BehaviorSubject<boolean>(false);
    takenCharactersSubject = new BehaviorSubject<string[]>([]);
    takenCharacters$ = this.takenCharactersSubject.asObservable();
    roomLocked$ = this.roomLockedSubject.asObservable();
    room: Room;
    player: Player;

    constructor(
        private router: Router,
        private socketService: SocketService,
    ) {}

    notifyRoomLocked(isLocked: boolean): void {
        this.roomLockedSubject.next(isLocked);
    }

    getRoom(): Room | undefined {
        return this.room;
    }

    getMap(): Map | undefined {
        return this.room ? this.room.map : undefined;
    }

    // Connects and creates a room on the server and returns the roomId
    async createRoom(map: Map): Promise<void> {
        this.socketService.connect();
        this.socketService.send<Map>(GameSessionEvents.CreateRoom, map);
        return new Promise((resolve, reject) => {
            this.socketService.on<Room>(GameSessionEvents.CreateAck, (room: Room) => {
                this.room = room;
                const currentPlayer = room.players.find((p) => p.socketId === this.socketService.getId());
                if (currentPlayer) {
                    this.player = currentPlayer;
                    this.player.isHost = true;
                }
                this.room.takenCharacters = [];
                this.takenCharactersSubject.next([]);
                this.enableListners();
                resolve();
            });

            this.socketService.on<Room>(GameSessionEvents.CreateFailed, () => {
                reject('Failure to create room');
            });

            setTimeout(() => {
                reject('No response received within timeout');
            }, CONSTANTS.ROOM_TIMEOUT_DELAY);
        });
    }

    // Joins a room only if its composed of 4 numeric digits
    async joinRoom(roomId: string): Promise<Room> {
        if (!/^[0-9]{4}$/.test(roomId)) return Promise.reject('Le code est invalide, entrez un code de 4 chiffres');

        this.socketService.connect();
        this.socketService.send<string>(GameSessionEvents.JoinRoom, roomId);
        return new Promise((resolve, reject) => {
            this.socketService.on<Room>(GameSessionEvents.JoinAck, (room: Room) => {
                this.room = room;
                const currentPlayer = room.players.find((p) => p.socketId === this.socketService.getId());
                if (currentPlayer) {
                    this.player = currentPlayer;
                }
                this.enableListners();
                resolve(room);
            });

            this.socketService.on<string>(GameSessionEvents.JoinFailed, (errorMessage: string) => {
                reject(errorMessage);
            });

            setTimeout(() => {
                reject('No response received within timeout');
            }, CONSTANTS.ROOM_TIMEOUT_DELAY);
        });
    }

    sendPlayerInfos(userName: string, characterType: string, attributes: Attributes, nbWins: number, inventory: Item[]): void {
        if (this.socketService.isSocketAlive()) {
            this.player = {
                userName,
                attributes,
                characterType,
                isHost: this.player.isHost,
                socketId: this.socketService.getId(),
                nbWins,
                hasActed: false,
                inventory,
            } as unknown as Player;
            this.socketService.send<Player>(GameSessionEvents.UpdatePlayerInfo, this.player);
        }
    }

    leaveRoom(): void {
        if (this.room && this.socketService.isSocketAlive()) {
            this.socketService.send<string>(GameSessionEvents.LeaveRoom, this.room.code);
            this.socketService.disconnect();
        }
    }

    removePlayer(playerId: string): void {
        // We make sure that this functionnality is accessed only by host
        if (this.player.isHost && this.socketService.isSocketAlive()) {
            this.socketService.send<{ roomId: string; playerId: string }>(GameSessionEvents.RemovePlayer, { roomId: this.room.code, playerId });
        }
    }

    toogleRoomLock() {
        if (this.player.isHost && this.socketService.isSocketAlive()) {
            this.socketService.send<{ roomId: string; isLocked: boolean }>(GameSessionEvents.ToggeLock, {
                roomId: this.room.code,
                isLocked: !this.room.isLocked,
            });
        }
    }

    addVirtualPlayer(isAgressive: boolean) {
        this.socketService.send(GameSessionEvents.AddVirtualPlayer, { roomId: this.room.code, isAgressive });
    }

    enableListners() {
        if (!this.socketService.isSocketAlive()) return;
        this.socketService.on<Player[]>(GameSessionEvents.PlayersUpdate, (players) => {
            this.room.players.splice(0, this.room.players.length, ...players);
            const myPlayer = this.room.players.find((player: Player) => player.socketId === this.socketService.getId());
            if (myPlayer) this.player.userName = myPlayer.userName;
        });
        this.socketService.on(GameSessionEvents.TakenCharactersUpdate, (characters: string[]) => {
            this.room.takenCharacters = characters;
            this.takenCharactersSubject.next(characters);
        });
        this.socketService.on<boolean>(GameSessionEvents.RoomLockToggled, (isLocked) => {
            this.room.isLocked = isLocked;
        });
        this.socketService.on<void>(GameSessionEvents.RoomDestroyed, () => {
            this.router.navigate(['/home']);
        });
        this.socketService.on<void>(GameLogicEvents.StartGame, () => {
            this.router.navigate(['/game']);
        });
        this.socketService.on<boolean>(GameSessionEvents.RoomLockToggled, (isLocked) => {
            this.room.isLocked = isLocked;
            this.notifyRoomLocked(isLocked);
        });
    }

    getPlayer(): Player | undefined {
        return this.player;
    }

    isHost(): boolean {
        return this.player?.isHost ?? false;
    }
}
