import { Timer } from "@app/classes/timer/timer";
import {
  ACCESS_CODE_LENGTH,
  MAX_ACCESS_CODE_VALUE,
  PURCHASABLE_AVATARS,
} from "@app/constants";
import { GameTimers } from "@app/interfaces/game-timers";
import { defaultGlobalStats } from "@app/mocks/default-global-stats";
import { ChatService } from "@app/services/chat/chat.service";
import { UserService } from "@app/services/user/user.service";
import { DEFAULT_AVATARS } from "@common/avatars-info";
import { Game } from "@common/interfaces/game";
import { GameStatus, Room, GameAvailability } from "@common/interfaces/room";
import { ServerToClientEvent } from "@common/socket.events";
import { Injectable, Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";

export interface BlockStatus {
  isBlocked: boolean;
  hasBlockedUsers: string[];
}

export interface RoomAccessResult {
  allowed: boolean;
  errorType?: string;
  blockStatus?: BlockStatus;
}

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  rooms = new Map<string, Room>();
  private gameTimers = new Map<string, GameTimers>();
  private adminList = new Map<string, string>(); 
  private io: Server;

  constructor(
    private chatService: ChatService,
    private userService: UserService
  ) {}

  setServer(io: Server) {
    this.io = io;
  }

  getServer(): Server {
    if (!this.io) {
      throw new Error("Server is not initialized");
    }
    return this.io;
  }

  createRoom(
    socket: Socket,
    game: Game,
    gameAvailability: GameAvailability,
    entryFee: number,
    quickEliminationEnabled: boolean
  ): Room {
    const roomCode: string = this.getNewRoomCode();
    const ALL_AVATARS = [...DEFAULT_AVATARS, ...PURCHASABLE_AVATARS];
    const room: Room = {
      gameMap: game,
      roomId: roomCode,
      listPlayers: [],
      availableAvatars: ALL_AVATARS.map((avatar) => ({
        ...avatar,
        isTaken: false,
      })),
      adminId: socket.id,
      isLocked: false,
      gameStatus: GameStatus.Lobby,
      globalPostGameStats: defaultGlobalStats,
      gameAvailability: gameAvailability,
      entryFee: entryFee,
      quickEliminationEnabled: quickEliminationEnabled,
      dropInEnabled: false,
      playersRecords: new Map(),
    };
    this.logger.log("Entry Fee: " + entryFee);
    this.logger.log("Quick Elimination Enabled: " + quickEliminationEnabled);
    this.rooms.set(roomCode, room);
    this.setRoomTimers(roomCode);
    this.adminList[roomCode]= socket.data.userId;
    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    this.emitWaitingRoomsUpdate();

    return room;
  }

  isRoomActive(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  isPlayerAdmin(roomId:string, socket: Socket) {
    return this.adminList[roomId] === socket.data.userId;
  }

  async checkRoomAccess(
    client: Socket,
    roomId: string,
    forceJoin: boolean = false,
    isSpectator: boolean =false,
  ): Promise<RoomAccessResult> {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { allowed: false, errorType: "roomNotFound" };
    }
    if(isSpectator){
      return { allowed: true };
    }

    // Check friends-only access
    if (room.gameAvailability === GameAvailability.FriendsOnly) {
      const canJoin = await this.checkFriendsOnlyAccess(client, room);
      if (!canJoin) {
        return { allowed: false, errorType: "friendsOnlyAccess" };
      }
    }

    // Check blocking status
    const blockStatus = await this.checkBlockedStatus(client, room);

    if (blockStatus.isBlocked) {
      this.logger.debug(
        `Client ${client.id} cannot join room ${roomId} - blocked by player(s)`
      );
      return { allowed: false, errorType: "blockedByUserInRoom" };
    }

    if (blockStatus.hasBlockedUsers.length > 0 && !forceJoin) {
      this.logger.debug(
        `Client ${client.id} notified of blocked users in room ${roomId}`
      );
      return {
        allowed: false,
        errorType: "hasBlockedUsersInRoom",
        blockStatus,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if the joining user is blocked by anyone in the room
   * or if the joining user has blocked anyone in the room
   */
  async checkBlockedStatus(client: Socket, room: Room): Promise<BlockStatus> {
    try {
      const joiningUserId = client.data.userId;
      if (!joiningUserId) {
        return { isBlocked: false, hasBlockedUsers: [] };
      }

      const playersInRoom = await this.getPlayersInRoom(room);

      // Check if joining user is blocked by someone in the room
      const isBlockedPromises = playersInRoom.map(async (playerId) => {
        const playerSocket = this.io.sockets.sockets.get(playerId);
        if (!playerSocket || !playerSocket.data.userId) {
          return false;
        }

        const blockedUsers = await this.userService.getBlockedUsers(
          playerSocket.data.userId
        );
        return blockedUsers.some((user) => user.uid === joiningUserId);
      });

      const blockResults = await Promise.all(isBlockedPromises);
      const isBlocked = blockResults.some((result) => result === true);

      // Check if joining user has blocked anyone in the room
      const joiningUserBlocked = await this.userService.getBlockedUsers(
        joiningUserId
      );
      const blockedUsersInRoom = playersInRoom.filter((playerId) => {
        const playerSocket = this.io.sockets.sockets.get(playerId);
        return (
          playerSocket?.data.userId &&
          joiningUserBlocked.some(
            (user) => user.uid === playerSocket.data.userId
          )
        );
      });

      return {
        isBlocked,
        hasBlockedUsers: blockedUsersInRoom,
      };
    } catch (error) {
      this.logger.error(`Error checking blocked status: ${error.message}`);
      return { isBlocked: false, hasBlockedUsers: [] };
    }
  }

  /**
   * Check if a user is friends with the room admin (for friends-only rooms)
   */
  async checkFriendsOnlyAccess(client: Socket, room: Room): Promise<boolean> {
    try {
      if (room.adminId === client.id) {
        return true;
      }

      const adminSocket = this.io.sockets.sockets.get(room.adminId);
      if (!adminSocket || !adminSocket.data.userId) {
        return false;
      }

      const joiningUserId = client.data.userId;
      if (!joiningUserId) {
        return false;
      }

      const adminFriends = await this.userService.getFriends(
        adminSocket.data.userId
      );

      return adminFriends.some((friend) => friend.uid === joiningUserId);
    } catch (error) {
      this.logger.error(`Error checking friends-only access: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all player socket IDs in a room
   */
  async getPlayersInRoom(room: Room): Promise<string[]> {
    const socketsInRoom = await this.io.in(room.roomId).fetchSockets();
    return socketsInRoom.map((socket) => socket.id);
  }

  leaveRoom(roomId: string, socket: Socket) {
    if (!socket) {
      return;
    }
    socket.leave(roomId);
    socket.data = { ...socket.data, roomCode: null, clickedAvatar: null };
  }

  removeAdmin(socket: Socket) {
    this.adminList.delete(socket.data.userId);
  }

  deleteRoom(roomId: string, socket: Socket) {
    socket
      .to(roomId)
      .emit(ServerToClientEvent.RoomDeleted, "DIALOG.MESSAGE.CANCELED_MATCH");
      if (this.isPlayerAdmin(roomId, socket)) {
      this.removeAdmin(socket);
    }
    this.cleanSocketsData(roomId);
    this.chatService.deleteMessagesByRoom(roomId);
    this.rooms.delete(roomId);
    this.io.in(roomId).socketsLeave(roomId);

    this.emitWaitingRoomsUpdate();
  }

  cleanSocketsData(roomId: string) {
    const socketsInRoom = this.io.sockets.adapter.rooms.get(roomId);
    socketsInRoom?.forEach((socketId) => {
      const socketInRoom = this.io.sockets.sockets.get(socketId);
      if (socketInRoom) {
        socketInRoom.data = {
          ...socketInRoom.data,
          roomCode: null,
          clickedRoom: null,
        };
      }
    });
  }

  getRoomId(client: Socket) {
    const roomCode = client.data?.roomCode;
    return this.isRoomActive(roomCode) ? roomCode : null;
  }

  getRoom(client: Socket) {
    const roomCode = this.getRoomId(client);
    return this.rooms.get(roomCode);
  }

  getRoomById(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomMap(roomId: string): Game {
    return this.rooms.get(roomId).gameMap;
  }

  getTurnTimer(roomId: string) {
    return this.gameTimers.get(roomId).turnTimer;
  }

  getFightTimer(roomId: string) {
    return this.gameTimers.get(roomId).fightTimer;
  }

  joinRoom(socket: Socket, roomId: string) {
    if (!this.isRoomActive(roomId)) {
      return;
    }
    socket.join(roomId);
    socket.data.roomCode = roomId;
  }

  private setRoomTimers(roomId: string) {
    const timers: GameTimers = {
      turnTimer: new Timer(),
      fightTimer: new Timer(),
    };
    this.gameTimers.set(roomId, timers);
  }

  private generateRoomCode(): string {
    const code = Math.floor(Math.random() * MAX_ACCESS_CODE_VALUE);
    return code.toString().padStart(ACCESS_CODE_LENGTH, "0");
  }

  private getNewRoomCode(): string {
    let roomCode = this.generateRoomCode();
    while (this.isRoomActive(roomCode)) {
      roomCode = this.generateRoomCode();
    }
    return roomCode;
  }

  /**
   * Get all waiting rooms (rooms in Lobby status)
   * @returns Array of waiting rooms with basic information
   */
  async getWaitingRooms(requestingUserId?: string): Promise<
    Array<{
      roomId: string;
      gameName: string;
      gameImage: string;
      gameDescription: string;
      gameMode: string;
      gameDimension: number;
      playerCount: number;
      maxPlayers: number;
      gameAvailability: GameAvailability;
      adminId: string;
      entryFee: number;
      dropInEnabled: boolean;
      gameStatus: GameStatus;
      canJoin: Boolean;
    }>
  > {
    const waitingRooms: Array<{
      roomId: string;
      gameName: string;
      gameImage: string;
      gameDescription: string;
      gameMode: string;
      gameDimension: number;
      playerCount: number;
      maxPlayers: number;
      gameAvailability: GameAvailability;
      adminId: string;
      entryFee: number;
      dropInEnabled: boolean;
      gameStatus: GameStatus;
      canJoin: Boolean;
    }> = [];

    let userFriends: string[] = [];
    let usersWhoBlockedMe: string[] = [];

    if (requestingUserId) {
      try {
        const friends = await this.userService.getFriends(requestingUserId);
        userFriends = friends.map((f) => f.uid);
        const userAccount = await this.userService.getUserAccount(
          requestingUserId
        );
        usersWhoBlockedMe = userAccount?.blockers || [];
      } catch (error) {
        this.logger.error(
          `Error fetching user relationships: ${error.message}`
        );
      }
    }

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.gameStatus === GameStatus.Ended) {
        continue;
      }
      let canJoin = true;
      if (requestingUserId) {
        const adminSocket = this.io.sockets.sockets.get(room.adminId);
        const adminUserId = adminSocket?.data?.userId;

        if (room.gameAvailability === GameAvailability.FriendsOnly) {
          if (
            adminUserId &&
            adminUserId !== requestingUserId &&
            !userFriends.includes(adminUserId)
          ) {
            canJoin = false;
          }
        }

        let isBlockedByRoomMember = false;
        for (const player of room.listPlayers) {
          const playerSocket = this.io.sockets.sockets.get(player.id);
          const playerUserId = playerSocket?.data?.userId;

          if (playerUserId && usersWhoBlockedMe.includes(playerUserId)) {
            isBlockedByRoomMember = true;
            break;
          }
        }

        if (isBlockedByRoomMember) {
          canJoin = false;
        }
        if (
          (room.gameStatus === GameStatus.Lobby && room.isLocked) ||
          (room.gameStatus === GameStatus.Started && !room.dropInEnabled)
        ) {
          canJoin = false;
        }
      } else {
        canJoin = false;
      }
      if (!(canJoin || room.gameStatus === GameStatus.Started)) {
        continue;
      }
      waitingRooms.push({
        roomId: room.roomId,
        gameName: room.gameMap.name,
        gameImage: room.gameMap.image,
        gameDescription: room.gameMap.description,
        gameMode: room.gameMap.mode,
        gameDimension: room.gameMap.dimension,
        playerCount: room.listPlayers.length,
        maxPlayers: room.gameMap.nbPlayers || 4,
        gameAvailability: room.gameAvailability,
        adminId: room.adminId,
        entryFee: room.entryFee,
        dropInEnabled: room.dropInEnabled,
        gameStatus: room.gameStatus,
        canJoin: canJoin,
      });
    }

    return waitingRooms;
  }

  /**
   * Emit waiting rooms update to all connected clients
   * Each client receives a filtered list based on their friends and blocking relationships
   */
  async emitWaitingRoomsUpdate() {
    if (this.io) {
      try {
        const sockets = await this.io.fetchSockets();

        for (const socket of sockets) {
          try {
            const userId = socket.data?.userId;
            const waitingRooms = await this.getWaitingRooms(userId);

            socket.emit(ServerToClientEvent.WaitingRoomsUpdated, waitingRooms);
          } catch (error) {
            this.logger.error(
              `Error emitting waiting rooms to socket ${socket.id}: ${error.message}`
            );
          }
        }
      } catch (error) {
        this.logger.error(`Error in emitWaitingRoomsUpdate: ${error.message}`);
      }
    }
  }
}
