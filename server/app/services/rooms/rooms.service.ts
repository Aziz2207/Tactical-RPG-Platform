import { ActionsService } from '@app/services/actions/actions.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { CONSTANTS } from '@common/constants';
import { GameSessionEvents } from '@common/event-enums/gameSession.gateway.events';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
export class RoomService {
    private rooms: Room[] = [];

    constructor(
        private virtualPlayerService: VirtualPlayerService,
        private actionsService: ActionsService,
    ) {}

    // Create a new room as host
    createRoom(roomId: string, socket: Socket, map: Map): void {
        if (this.checkRoomExists(roomId)) {
            socket.emit(GameSessionEvents.CreateFailed);
            return;
        }
        const room = this.generateNewRoom(this.getMaxPlayers(map), socket.id, roomId, map);
        this.rooms.push(room);
        socket.join(roomId);
        socket.emit(GameSessionEvents.CreateAck, room);
    }

    // Joins room. Sends an error if non existant.
    joinRoom(roomId: string, socket: Socket): void {
        const roomFound: Room | undefined = this.rooms.find((room) => room.code === roomId);
        const playerFound: Player | undefined = roomFound?.players.find((player) => player.socketId === socket.id);
        const isRoomFull: boolean = roomFound?.players.length >= roomFound?.maxPlayers;
        if (!roomFound) {
            socket.emit(GameSessionEvents.JoinFailed, 'La salle existe pas');
            return;
        }
        if (roomFound.isLocked || isRoomFull) {
            socket.emit(GameSessionEvents.JoinFailed, 'La salle est verouillee');
            return;
        }

        if (roomFound && !playerFound && !roomFound.isLocked) {
            const player = this.generateNewPlayer(false, socket.id);
            roomFound.players.push(player);
            socket.join(roomId);
            socket.emit(GameSessionEvents.JoinAck, roomFound);
            socket.emit(GameSessionEvents.TakenCharactersUpdate, roomFound.takenCharacters);
            socket.to(roomId).emit(GameSessionEvents.PlayersUpdate, roomFound.players);
        } else {
            socket.emit(GameSessionEvents.JoinFailed);
        }
    }

    // Leaves room and removes player from the playerList
    leaveRoom(roomId: string, socket: Socket, server: Server): void {
        const roomFound: Room | undefined = this.rooms.find((room) => room.code === roomId);
        const leavingPlayer = this.findPlayerBySocketId(roomId, socket.id);
        if (roomFound && leavingPlayer) {
            const isHostLeaving = leavingPlayer.isHost;
            roomFound.players = roomFound.players.filter((player) => player.socketId !== socket.id);
            roomFound.takenCharacters = roomFound.takenCharacters.filter((character) => character !== leavingPlayer.characterType);
            socket.leave(roomId);
            // Destroy room if no players or no host
            if (isHostLeaving && !roomFound.isActive) {
                socket.to(roomId).emit(GameSessionEvents.HostLeft);
                server.socketsLeave(roomId);
                this.destroyRoom(roomFound.code);
            } else if (roomFound.players.length === 0) {
                this.destroyRoom(roomFound.code);
                server.socketsLeave(roomId);
                socket.in(roomId).emit(GameSessionEvents.PlayersUpdate, roomFound.players);
            } else {
                socket.in(roomId).emit(GameSessionEvents.TakenCharactersUpdate, roomFound.takenCharacters);
                server.to(roomId).emit(GameSessionEvents.PlayersUpdate, roomFound.players);
                server.to(roomId).emit(GameSessionEvents.LeaveRoom, roomFound.players);
            }
        }
    }

    removePlayer(roomId: string, playerId: string, socket: Socket) {
        const roomFound: Room | undefined = this.rooms.find((room) => room.code === roomId);
        if (roomFound && roomFound.players) {
            const playerToRemove = roomFound.players.find((player) => player.socketId === playerId);
            if (playerToRemove) {
                roomFound.players = roomFound.players.filter((player) => player !== playerToRemove);
                roomFound.takenCharacters = roomFound.takenCharacters.filter((character) => character !== playerToRemove.characterType);
                socket.in(roomId).emit(GameSessionEvents.TakenCharactersUpdate, roomFound.takenCharacters);
                socket.emit(GameSessionEvents.TakenCharactersUpdate, roomFound.takenCharacters);
                socket.emit(GameSessionEvents.PlayersUpdate, roomFound.players);
                socket.to(roomId).emit(GameSessionEvents.PlayersUpdate, roomFound.players);
                const socketToRemove = socket.nsp?.sockets?.get(playerId);
                if (socketToRemove) {
                    socketToRemove.leave(roomId);
                    socketToRemove.emit(GameSessionEvents.RemovedFromRoom);
                }
            }
        }
    }

    updatePlayerInfo(player: Player, socket: Socket): void {
        const room: Room | undefined = this.rooms.find((r) => r.players.some((p) => p.socketId === player.socketId));
        if (room) {
            const existingPlayer = room.players.find((p) => p.socketId === player.socketId);
            if (existingPlayer) {
                existingPlayer.userName = this.getUniqueUserName(room, player.userName);
                existingPlayer.attributes = player.attributes;
                existingPlayer.characterType = player.characterType;
                existingPlayer.nbWins = player.nbWins;
                room.takenCharacters.push(existingPlayer.characterType);
                socket.to(room.code).emit(GameSessionEvents.TakenCharactersUpdate, room.takenCharacters);
                socket.emit(GameSessionEvents.PlayersUpdate, room.players);
                socket.to(room.code).emit(GameSessionEvents.PlayersUpdate, room.players);
            }
            const isRoomFull = room.takenCharacters.length >= room.maxPlayers;
            if (isRoomFull) {
                this.toggleRoomLock(room.code, true, socket);
            }
        }
    }

    getUniqueUserName(room: Room, userName: string): string {
        let uniqueName = userName;
        let count = 1;
        while (room.players.some((player) => player.userName === uniqueName)) {
            count++;
            uniqueName = `${userName}-${count}`;
        }
        return uniqueName;
    }

    destroyRoom(roomId: string): void {
        this.rooms = this.rooms.filter((room) => room.code !== roomId);
    }

    toggleRoomLock(roomId: string, isLocked: boolean, socket: Socket): void {
        const roomFound: Room | undefined = this.rooms.find((room) => room.code === roomId);
        if (roomFound) {
            roomFound.isLocked = isLocked;
            socket.emit(GameSessionEvents.RoomLockToggled, isLocked);
            socket.to(roomId).emit(GameSessionEvents.RoomLockToggled, isLocked);
        }
    }

    getMaxPlayers(map: Map): number {
        const size = Number(map._size);
        let maxPlayers: number;
        if (size === CONSTANTS.SMALL_MAP_SIZE) {
            maxPlayers = CONSTANTS.PLAYER_COUNT_10;
        } else if (size === CONSTANTS.MEDIUM_MAP_SIZE) {
            maxPlayers = CONSTANTS.PLAYER_COUNT_15;
        } else if (size === CONSTANTS.LARGE_MAP_SIZE) {
            maxPlayers = CONSTANTS.PLAYER_COUNT_20;
        }
        return maxPlayers;
    }

    // creates a new room code unique to any other id. !! Could cause infinite loop if there are
    // more than 10000 rooms created :(
    generateRoomId(): string {
        let roomId: string;
        let roomExists = true;
        while (roomExists) {
            roomId = Math.floor(CONSTANTS.MIN_ACCESS_CODE + Math.random() * CONSTANTS.ACCESS_CODE_MUL).toString();
            roomExists = this.checkRoomExists(roomId);
        }
        return roomId;
    }

    checkRoomExists(roomId: string): boolean {
        // This is called a truthy check, it turns it into a boolean by double negation
        // To check if its truthy
        const roomFound = this.rooms.find((room) => room.code === roomId);
        return !!roomFound;
    }

    // Creates a new room for the host with roomCode it is given. Locked is true,
    // we dont want people joining before the host is ready.
    generateNewRoom(size: number, socketId: string, roomId: string, map: Map): Room {
        this.actionsService.checkForMystery(map._tiles);
        return {
            code: roomId,
            players: [this.generateNewPlayer(true, socketId)],
            maxPlayers: size, // To be set to a variable
            isLocked: false,
            takenCharacters: [],
            isActive: false,
            map,
        };
    }

    // New player with empty name and attributes, optional is host
    generateNewPlayer(isHost: boolean, socketId: string): Player {
        return {
            userName: '',
            attributes: {
                speedPoints: -1,
                currentSpeed: -1,

                lifePoints: -1,

                offensePoints: -1,

                defensePoints: -1,

                diceChoice: 'attack',

                currentHP: -1,

                actionLeft: -1,
            },
            characterType: '', // genericplayer.jpg
            isHost,
            socketId,
            nbWins: 0,
            hasActed: false,
            position: { x: -1, y: -1 },
            isVirtual: false,
            inventory: [],
            hasFlag: false,
        };
    }

    findPlayerBySocketId(roomId: string, socketId: string): Player | undefined {
        const room = this.rooms.find((r) => r.code === roomId);
        return room?.players.find((player) => player.socketId === socketId);
    }

    getRoom(roomId: string): Room {
        return this.rooms.find((room: Room) => {
            return room.code === roomId;
        });
    }

    getRoomCodeBySocketId(socketId: string) {
        const roomFound = this.rooms.find((room: Room) => {
            return room.players.find((player: Player) => socketId === player.socketId);
        });
        return roomFound ? roomFound.code : '';
    }

    addVirtualPlayer(roomID: string, isAgressive: boolean, socket: Socket) {
        const room = this.getRoom(roomID);
        const existingNames: string[] = room.players.map((player) => player.userName);
        const virtualPlayer: Player = this.virtualPlayerService.generateVirtualPlayer(room.takenCharacters, existingNames, isAgressive);
        room.players.push(virtualPlayer);
        room.takenCharacters.push(virtualPlayer.characterType);
        const isRoomFull = room.takenCharacters.length >= room.maxPlayers;
        socket.to(room.code).emit(GameSessionEvents.TakenCharactersUpdate, room.takenCharacters);
        socket.emit(GameSessionEvents.TakenCharactersUpdate, room.takenCharacters);
        socket.emit(GameSessionEvents.PlayersUpdate, room.players);
        socket.to(room.code).emit(GameSessionEvents.PlayersUpdate, room.players);
        if (isRoomFull) {
            this.toggleRoomLock(room.code, true, socket);
        }
    }
}
