import {IMessage} from "@app/interfaces/message.interface";
import {CombatService} from "@app/services/combat/combat.service";
import {GameService} from "@app/services/game/game.service";
import {MessageService} from "@app/services/message/message.service";
import {RoomService} from "@app/services/room/room.service";
import {UserService} from "@app/services/user/user.service";
import {
  PrivateRoomService,
  CreatePrivateRoomDto,
  JoinPrivateRoomDto,
} from "@app/services/private-room/private-room.service";
import {Game} from "@common/interfaces/game";
import {
  Avatar,
  Behavior,
  Player,
  Position,
  Status,
} from "@common/interfaces/player";
import {ActionData} from "@common/interfaces/socket-data.interface";
import {ClientToServerEvent, ServerToClientEvent} from "@common/socket.events";
import {Injectable, Logger, OnModuleInit, Inject} from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import {Server, Socket} from "socket.io";
import * as admin from "firebase-admin";
import {GameAvailability, GameStatus, Room} from "@common/interfaces/room";
import {FriendService} from "@app/services/friend/friend.service";
import {ConnectedSocket, MessageBody} from "@nestjs/websockets/decorators";
import {UserStatisticsService} from "@app/services/user-statistics/user-statistics.service";
import { MessageType } from '@common/interfaces/message-type';

@WebSocketGateway({cors: {origin: "*"}})
@Injectable()
export class SocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  private server: Server;

  constructor(
    private roomService: RoomService,
    private logger: Logger,
    private messageService: MessageService,
    private combatService: CombatService,
    private gameService: GameService,
    private privateRoomService: PrivateRoomService,
    private userService: UserService,
    private friendService: FriendService,
    private userStatisticsService: UserStatisticsService,
    @Inject("FIREBASE_ADMIN") private readonly firebaseAdmin: typeof admin
  ) {}

  @SubscribeMessage(ClientToServerEvent.CreateRoom)
  handleCreateRoom(
    client: Socket,
    roomData: {
      game: Game;
      gameAvailability: GameAvailability;
      entryFee: number;
      quickEliminationEnabled: boolean;
    }
  ): void {
    const room = this.roomService.createRoom(
      client,
      roomData.game,
      roomData.gameAvailability,
      roomData.entryFee,
      roomData.quickEliminationEnabled
    );
    client.emit(ServerToClientEvent.RoomCreated, room);
    this.logger.log(`Room ${room.roomId} created by admin: ${client.id}`);
  }

  @SubscribeMessage(ClientToServerEvent.JoinRoom)
  async handleJoinRoom(
    client: Socket,
    payload: {roomId: string; forceJoin?: boolean; isSpectator?: boolean}
  ): Promise<void> {
    try {
      const roomId = typeof payload === "string" ? payload : payload.roomId;
      const forceJoin = typeof payload === "object" ? payload.forceJoin : false;
      const isSpectator =
        typeof payload === "object" ? payload.isSpectator : false;
      this.gameService.validateAndJoinRoom(
        client,
        roomId,
        forceJoin,
        isSpectator,
        this.server
      );
      client.emit(ServerToClientEvent.EnterWaitingRoom, { roomId });
    } catch (error) {
      client.emit(ServerToClientEvent.JoinError, "serverError");
      this.logger.error(`Error joining room: ${error.message}`);
    }
  }

  @SubscribeMessage(ClientToServerEvent.LeaveRoom)
  async handleLeaveRoom(client: Socket, roomId: string): Promise<void> {
    this.logger.error(`Client ${client.id} is leaving room ${roomId}`);
    client.emit(ServerToClientEvent.ExitWaitingRoom, { roomId });
    await this.gameService.leavePlayerFromGame(roomId, client);
  }

  @SubscribeMessage(ClientToServerEvent.ChangeLockRoom)
  handleLockRoom(client: Socket, isLocked: boolean) {
    if (this.blockSpectator(client)) return;
    const roomId = this.roomService.getRoomId(client);
    this.gameService.toggleLockRoom(roomId, isLocked);
  }

  @SubscribeMessage(ClientToServerEvent.IsLocked)
  handleIsRoomLocked(client: Socket) {
    const room = this.roomService.getRoom(client);
    client.emit(
      ServerToClientEvent.IsRoomLocked,
      (room.isLocked && room.gameStatus === GameStatus.Lobby) ||
        (!room.dropInEnabled && room.gameStatus === GameStatus.Started)
    );
  }

  @SubscribeMessage(ClientToServerEvent.GetWaitingRooms)
  async handleGetWaitingRooms(client: Socket) {
    this.logger.log(
      `Client ${client.id} requested waiting rooms list via socket`
    );
    const userId = client.data?.userId;
    const waitingRooms = await this.roomService.getWaitingRooms(userId);
    client.emit(ServerToClientEvent.WaitingRoomsUpdated, waitingRooms);
  }

  @SubscribeMessage(ClientToServerEvent.GetSpectatorStatus)
  handleGetSpectatorStatus(client: Socket) {
    const isSpectator = this.gameService.isSpectator(client);
    client.emit(ServerToClientEvent.SpectatorStatus, isSpectator);
  }

  @SubscribeMessage(ClientToServerEvent.CreatePlayer)
  handleCreatePlayer(client: Socket, player: Player) {
    if (this.blockSpectator(client)) return;
    const room = this.roomService.getRoom(client);
    this.gameService.handleCreatePlayer(room, player, client);
    this.logger.debug(
      `Player created with client ${client.id} in room ${room.roomId}`
    );
  }

  @SubscribeMessage(ClientToServerEvent.CreateBot)
  handleCreateBot(client: Socket, behavior: Behavior) {
    if (this.blockSpectator(client)) return;
    this.gameService.createBot(behavior, client);
  }

  @SubscribeMessage(ClientToServerEvent.SelectCharacter)
  handleSelectCharacter(client: Socket, avatar: Avatar) {
    if (this.blockSpectator(client)) return;
    const room = this.roomService.getRoom(client);
    this.gameService.selectedAvatar(room, avatar, client);
  }

  @SubscribeMessage(ClientToServerEvent.KickPlayer)
  handleKickPlayer(client: Socket, playerId: string) {
    if (this.blockSpectator(client)) return;
    this.gameService.onKickPlayer(client, playerId);
    this.logger.debug(`client ${playerId} was kicked out of room`);
  }

  @SubscribeMessage(ClientToServerEvent.KickBot)
  handleKickBot(client: Socket, botId: string) {
    if (this.blockSpectator(client)) return;
    this.gameService.onKickBot(client, botId);
    this.logger.debug(`bot ${botId} was kicked out of room`);
  }

  @SubscribeMessage(ClientToServerEvent.StartGame)
  handleStartGame(client: Socket) {
    if (this.blockSpectator(client)) return;
    this.gameService.onStartGame(client);
  }

  @SubscribeMessage(ClientToServerEvent.FindPath)
  handleFindPath(client: Socket, destination: Position) {
    const room = this.roomService.getRoom(client);
    const activePlayer = this.gameService.getActivePlayer(room);
    const path = room.navigation.findFastestPath(
      activePlayer,
      destination,
      room
    );
    client.emit(ServerToClientEvent.PathFound, path);
  }

  @SubscribeMessage(ClientToServerEvent.AttackPlayer)
  handleAttackPlayer(client: Socket) {
    if (this.blockSpectator(client)) return;
    const room = this.roomService.getRoom(client);
    this.combatService.attackPlayer(room);
  }

  @SubscribeMessage(ClientToServerEvent.ItemSwapped)
  handleItemSwapped(
    client: Socket,
    {inventoryToUndo, newInventory, droppedItem}
  ) {
    if (this.blockSpectator(client)) return;
    this.gameService.startItemSwap({
      server: this.server,
      client,
      oldInventory: inventoryToUndo,
      modifiedInventory: newInventory,
      droppedItem,
    });
  }

  @SubscribeMessage(ClientToServerEvent.EvadeCombat)
  handleEvadeCombat(client: Socket, evaderId: string) {
    if (this.blockSpectator(client)) return;
    const room = this.roomService.getRoom(client);
    this.combatService.evadingPlayer(room, evaderId);
  }

  @SubscribeMessage(ClientToServerEvent.EndTurn)
  handleEndTurn(client: Socket) {
    if (this.blockSpectator(client)) return;
    const room = this.roomService.getRoom(client);
    this.gameService.onTurnEnded(room);
    this.logger.debug(`client ${client.id} turn is over`);
  }

  @SubscribeMessage(ClientToServerEvent.StartTurn)
  handleBeforeStartTurn(client: Socket) {
    const room = this.roomService.getRoom(client);
    this.gameService.onStartTurn(room);
  }

  @SubscribeMessage(ClientToServerEvent.SendMessage)
  async handleMessage(client: Socket, message: IMessage): Promise<void> {
    await this.messageService.onMessageReceived(client, this.server, message);
  }

  @SubscribeMessage(ClientToServerEvent.PlayerNavigation)
  handlePlayerNavigation(client: Socket, path: Position[]) {
    if (this.blockSpectator(client)) return;
    const room = this.roomService.getRoom(client);
    this.gameService.processNavigation(room, path, client);
  }

  @SubscribeMessage(ClientToServerEvent.DoorAction)
  handleDoorAction(client: Socket, doorActionData: ActionData) {
    if (this.blockSpectator(client)) return;
    this.gameService.handleDoor(client, doorActionData);
  }

  @SubscribeMessage(ClientToServerEvent.CombatAction)
  handleCombatAction(client: Socket, combatActionData: ActionData) {
    if (this.blockSpectator(client)) return;
    const room = this.roomService.getRoom(client);
    this.combatService.startFight(room, combatActionData);
  }

  @SubscribeMessage(ClientToServerEvent.CreatePrivateRoom)
  async handleCreatePrivateRoom(client: Socket, {name}: {name: string}) {
    try {
      if (!this.isAuthenticated(client)) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Authentification requise"
        );
        return;
      }

      const userId = this.getUserId(client);
      const username = this.getUsername(client);

      if (!userId || !username) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Informations utilisateur manquantes"
        );
        return;
      }

      const createRoomDto: CreatePrivateRoomDto = {
        name,
        ownerId: userId,
        ownerUsername: username,
      };

      const room = await this.privateRoomService.createPrivateRoom(
        createRoomDto
      );

      client.join(`private:${room.roomId}`);

      client.emit(ServerToClientEvent.PrivateRoomCreated, room);
      client.broadcast.emit(ServerToClientEvent.PrivateRoomCreated, room);

      this.logger.log(`Private room ${room.roomId} created by ${userId}`);
    } catch (error) {
      client.emit(
        ServerToClientEvent.ErrorMessage,
        `Erreur lors de la création: ${error.message}`
      );
    }
  }

  @SubscribeMessage(ClientToServerEvent.JoinPrivateRoom)
  async handleJoinPrivateRoom(client: Socket, {roomId}: {roomId: string}) {
    try {
      if (!this.isAuthenticated(client)) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Authentification requise"
        );
        return;
      }

      const userId = this.getUserId(client);
      const username = this.getUsername(client);

      if (!userId || !username) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Informations utilisateur manquantes"
        );
        return;
      }

      const joinDto: JoinPrivateRoomDto = {
        roomId,
        userId,
        username,
      };

      const room = await this.privateRoomService.joinRoom(joinDto);

      client.join(`private:${roomId}`);

      if (!client.data.privateRooms) {
        client.data.privateRooms = [];
      }
      if (!client.data.privateRooms.includes(roomId)) {
        client.data.privateRooms.push(roomId);
      }

      await this.privateRoomService.notifyRoomMembers(
        this.server,
        roomId,
        ServerToClientEvent.PrivateRoomUpdated,
        {room, newMember: {userId, username}},
        userId
      );

      client.emit(ServerToClientEvent.PrivateRoomUpdated, room);

      client.join(`private:${roomId}`);

      if (!client.data.privateRooms) {
        client.data.privateRooms = [];
      }
      if (!client.data.privateRooms.includes(roomId)) {
        client.data.privateRooms.push(roomId);
      }
      client.data.userId = userId;

      this.logger.log(`User ${userId} joined private room ${roomId}`);
    } catch (error) {
      client.emit(
        ServerToClientEvent.ErrorMessage,
        `Erreur lors de la connexion: ${error.message}`
      );
    }
  }

  @SubscribeMessage(ClientToServerEvent.GetUserPrivateRooms)
  async handleGetUserPrivateRooms(client: Socket) {
    try {
      if (!this.isAuthenticated(client)) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Authentification requise"
        );
        return;
      }

      const userId = this.getUserId(client);
      if (!userId) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Informations utilisateur manquantes"
        );
        return;
      }

      const rooms = await this.privateRoomService.getUserRooms(userId);
      client.emit(ServerToClientEvent.UserPrivateRooms, rooms);
    } catch (error) {
      client.emit(
        ServerToClientEvent.ErrorMessage,
        `Erreur lors de la récupération: ${error.message}`
      );
    }
  }

  @SubscribeMessage(ClientToServerEvent.GetAllPrivateRooms)
  async handleGetAllPrivateRooms(client: Socket) {
    try {
      if (!this.isAuthenticated(client)) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Authentification requise"
        );
        return;
      }

      const userId = this.getUserId(client);
      if (!userId) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Informations utilisateur manquantes"
        );
        return;
      }

      const rooms = await this.privateRoomService.getAllAvailableRooms(userId);
      client.emit(ServerToClientEvent.AllPrivateRooms, rooms);
    } catch (error) {
      client.emit(
        ServerToClientEvent.ErrorMessage,
        `Erreur lors de la récupération: ${error.message}`
      );
    }
  }

  @SubscribeMessage(ClientToServerEvent.LeavePrivateRoom)
  async handleLeavePrivateRoom(client: Socket, {roomId}: {roomId: string}) {
    try {
      if (!this.isAuthenticated(client)) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Authentification requise"
        );
        return;
      }

      const userId = this.getUserId(client);
      if (!userId) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Informations utilisateur manquantes"
        );
        return;
      }

      const result = await this.privateRoomService.leaveRoom(roomId, userId);

      client.leave(roomId);
      if (client.data.privateRooms) {
        client.data.privateRooms = client.data.privateRooms.filter(
          (id: string) => id !== roomId
        );
      }

      if (!result.room.isActive) {
        this.logger.log(`Room ${roomId} was deleted after ${userId} left.`);
      } else {
        await this.privateRoomService.notifyRoomMembers(
          this.server,
          roomId,
          ServerToClientEvent.PrivateRoomUpdated,
          {room: result.room, leftUserId: userId}
        );
      }

      client.emit(ServerToClientEvent.PrivateRoomLeft, {
        roomId,
        deleted: !result.room.isActive,
      });

      this.logger.log(`User ${userId} left private room ${roomId}`);
    } catch (error) {
      client.emit(
        ServerToClientEvent.ErrorMessage,
        `Erreur lors de la sortie: ${error.message}`
      );
    }
  }

  @SubscribeMessage(ClientToServerEvent.DeletePrivateRoom)
  async handleDeletePrivateRoom(client: Socket, {roomId}: {roomId: string}) {
    try {
      if (!this.isAuthenticated(client)) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Authentification requise"
        );
        return;
      }

      const userId = this.getUserId(client);
      if (!userId) {
        client.emit(
          ServerToClientEvent.ErrorMessage,
          "Informations utilisateur manquantes"
        );
        return;
      }

      const roomBefore = await this.privateRoomService.getRoom(roomId);
      const success = await this.privateRoomService.deleteRoom(roomId, userId);

      if (success) {
        const socketsInRoom = await this.server.in(roomId).fetchSockets();

        socketsInRoom.forEach((socket) => {
          socket.leave(roomId);
          if (socket.data.privateRooms) {
            socket.data.privateRooms = socket.data.privateRooms.filter(
              (id: string) => id !== roomId
            );
          }

          this.server.emit(ServerToClientEvent.PrivateRoomDeleted, {
            roomId,
            roomName: roomBefore.name,
            deletedBy: userId,
          });
        });

        this.server.emit(ServerToClientEvent.PrivateRoomDeleted, {
          roomId,
          roomName: roomBefore.name,
          deletedBy: userId,
        });

        this.logger.log(`Private room ${roomId} deleted by ${userId}`);
      }
    } catch (error) {
      client.emit(
        ServerToClientEvent.ErrorMessage,
        `Erreur lors de la suppression: ${error.message}`
      );
    }
  }

  @SubscribeMessage(ClientToServerEvent.GetRoom)
  handleGetRoom(client: Socket) {
    const room = this.roomService.getRoom(client);
    if (!room) return;
    client.emit(ServerToClientEvent.ObtainRoomInfo, room);
    client.emit(ServerToClientEvent.MapInformation, room);
    client.emit(ServerToClientEvent.GameGridMapInfo, room);

    const activePlayer = room.listPlayers.find((p) => p.isActive);
    if (activePlayer) {
      client.emit(ServerToClientEvent.ActivePlayer, activePlayer);
    }

    this.combatService.syncWithCombat(room.roomId, client);
  }
  @SubscribeMessage(ClientToServerEvent.GetRoomInfo)
  handleGetRoomInfo(client: Socket) {
    const room = this.roomService.getRoom(client);
    this.server.to(room.roomId).emit(ServerToClientEvent.ObtainRoomInfo, room);
  }

  @SubscribeMessage(ClientToServerEvent.GetAllUsers)
  handleGetAllUsers(client: Socket) {
    const uid = this.getUserId(client);
    this.friendService.getAllUsers(client, this.server,uid);
  }

  @SubscribeMessage(ClientToServerEvent.GetEveryUser)
  async handleGetEveryUsers(client: Socket) {
    try {
      const users = await this.userService.getEveryUser();
      client.emit(ServerToClientEvent.EveryUser, users);
    } catch (error) {
      console.error("Error getting every user:", error);
      client.emit(ServerToClientEvent.ErrorMessage, "Failed to fetch users");
    }
  }

  @SubscribeMessage(ClientToServerEvent.SendFriendRequest)
  handleSendFriendRequest(
    client: Socket,
    {receiverUid}: {receiverUid: string}
  ) {
    this.friendService.sendFriendRequest(client, this.server, receiverUid);
  }

  @SubscribeMessage(ClientToServerEvent.AcceptFriendRequest)
  handleAcceptFriendRequest(
    client: Socket,
    {requesterUid}: {requesterUid: string}
  ) {
    this.friendService.acceptFriendRequest(client, this.server, requesterUid);
  }

  @SubscribeMessage(ClientToServerEvent.RejectFriendRequest)
  handleRejectFriendRequest(
    client: Socket,
    {requesterUid}: {requesterUid: string}
  ) {
    this.friendService.rejectFriendRequest(client, this.server, requesterUid);
  }

  @SubscribeMessage(ClientToServerEvent.GetFriendRequests)
  handleGetFriendRequests(client: Socket) {
    this.friendService.getFriendRequests(client, this.server);
  }

  @SubscribeMessage(ClientToServerEvent.GetFriends)
  handleGetFriends(client: Socket) {
    this.friendService.getFriends(client, this.server);
  }

  @SubscribeMessage(ClientToServerEvent.GetOnlineFriends)
  handleGetOnlineFriends(client: Socket) {
    this.friendService.getOnlineFriends(client);
  }

  @SubscribeMessage(ClientToServerEvent.RemoveFriend)
  handleRemoveFriend(client: Socket, {friendUid}: {friendUid: string}) {
    this.friendService.removeFriend(client, this.server, friendUid);
  }

  @SubscribeMessage(ClientToServerEvent.SearchUsers)
  handleSearchUsers(client: Socket, {username}: {username: string}) {
    this.friendService.searchUsers(client, this.server, username);
  }

  @SubscribeMessage(ClientToServerEvent.GetAdminFriends)
  handleGetAdminFriends(client: Socket, roomId: string) {
    this.friendService.getAdminFriends(client, this.server, roomId);
  }

  @SubscribeMessage(ClientToServerEvent.BlockUser)
  handleBlockUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {blockedUid: string}
  ) {
    this.friendService.blockUser(client, this.server, data.blockedUid);
  }

  @SubscribeMessage(ClientToServerEvent.UnblockUser)
  handleUnblockUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {blockedUid: string}
  ) {
    this.friendService.unblockUser(client, this.server, data.blockedUid);
  }

  @SubscribeMessage(ClientToServerEvent.GetBlockedUsers)
  handleGetBlockedUsers(@ConnectedSocket() client: Socket) {
    this.friendService.getBlockedUsers(client,this.server);
  }

  @SubscribeMessage(ClientToServerEvent.GetUserStatistics)
  async handleGetUserStatistics(client: Socket) {
    const statistics = await this.userStatisticsService.getUserStatistics(
      client.data.userId
    );
    this.logger.log("User statistics fetched");
    client.emit(ServerToClientEvent.UserStatistics, statistics);
  }

  @SubscribeMessage(ClientToServerEvent.GetAllUserStatistics)
  async handleGetAllUsersStatistics(client: Socket) {
    const allStatistics =
      await this.userStatisticsService.getAllUsersStatistics();
    this.logger.log("All users statistics fetched");
    client.emit(ServerToClientEvent.AllUserStatistics, allStatistics);
  }

  private getSocketsByUid(uid: string): Socket[] {
    const sockets = this.server.sockets.sockets;
    let userSockets = [];
    for (const [_, socket] of sockets) {
      if (socket.data.userId === uid) {
        userSockets.push(socket);
      }
    }
    return userSockets;
  }

  onModuleInit() {
    this.roomService.setServer(this.server);
    this.privateRoomService.setServer(this.server);
  }

  private blockSpectator(client: Socket): boolean {
    if (this.gameService.isSpectator(client)) {
      this.logger.warn(`Spectator ${client.id} attempted restricted action`);
      return true;
    }
    return false;
  }

  @SubscribeMessage(ClientToServerEvent.UpdateUserBalance)
  async handleUpdateUserBalance(
    client: Socket,
    payload: {amount: number; addToLifetimeEarnings: boolean}
  ) {
    try {
      const uid = this.getUserId(client);
      if (!uid) {
        return {success: false, error: "User not authenticated"};
      }

      await this.userService.updateUserBalance(
        uid,
        payload.amount,
        payload.addToLifetimeEarnings
      );

      client.emit(ServerToClientEvent.BalanceUpdated, {
        balance: payload.amount,
      });

      return {success: true, balance: payload.amount};
    } catch (error) {
      return {success: false, error: error.message};
    }
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    const isAuthenticated = await this.authenticateSocket(client);
    if (!isAuthenticated) {
      this.logger.warn(`Client ${client.id} failed authentication`);
      client.emit(ServerToClientEvent.ErrorMessage, "Authentification échouée");
      client.disconnect();
      return;
    }

    this.logger.log(
      `Client ${client.id} authenticated as ${client.data.username}`
    );
  }

  @SubscribeMessage(ClientToServerEvent.ChangeDropInEnabled)
  handleRoomDropIn(client: Socket, dropInEnabled: boolean) {
    const roomId = this.roomService.getRoomId(client);
    this.gameService.toggleDropInRoom(roomId, dropInEnabled);
  }

    handleDisconnect(client: Socket) {
        const room = this.roomService.getRoom(client);
        if (
      this.isAuthenticated(client) 
    ) {
            const userId = client.data.userId;
            const userSockets = this.getUserSockets(userId);
            const remainingSockets = userSockets.filter((socket) => socket.id !== client.id && socket.connected);
            if (remainingSockets.length === 0){
              this.userService.removeActiveUser(client.data.userId);
              this.friendService.notifyFriendsAboutStatus(
                  this.server,
                  client.data.userId,
                  ServerToClientEvent.UserDisconnected
              );
            } 
        }
        if (!room) {
            this.logger.log(
                `Client disconnected but was not in a room: ${client.id}`
            );
            return;
        }
        if (room) {
          client.emit(ServerToClientEvent.ExitWaitingRoom, {room:  room.roomId });
        }
        this.combatService.handleDisconnectedPlayer(client, room);
        this.logger.log(`Client disconnected: ${client.id}`);
            
        this.roomService.emitWaitingRoomsUpdate();
    }

  // Helper method to get all sockets for a user
  private getUserSockets(userId: string): Socket[] {
    const sockets: Socket[] = [];

    // Get all connected sockets from the server
    const connectedSockets = this.server.sockets.sockets;

    connectedSockets.forEach((socket) => {
      if (socket.data.userId === userId) {
        sockets.push(socket);
      }
    });

    return sockets;
  }

  private async authenticateSocket(socket: Socket): Promise<boolean> {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Socket ${socket.id}: Token manquant`);
        return false;
      }

      const decodedToken = await this.firebaseAdmin
        .auth()
        .verifyIdToken(token as string);

      const userAccount = await this.userService.getUserAccount(
        decodedToken.uid
      );

      if (!userAccount) {
        this.logger.warn(
          `Socket ${socket.id}: Utilisateur introuvable pour UID ${decodedToken.uid}`
        );
        return false;
      }

      socket.data.userId = decodedToken.uid;
      socket.data.username = userAccount.username;
      socket.data.email = userAccount.email;
      socket.data.avatarURL = userAccount.avatarURL;
      socket.data.isAuthenticated = true;
      const friends = await this.userService.getFriends(decodedToken.uid); 
      const onlineMap = this.userService.getOnlineStatus(
        friends.map(f => f.uid)
      ); 
      socket.emit(ServerToClientEvent.OnlineFriends, onlineMap);
      
      this.friendService.notifyFriendsAboutStatus(
        this.server,
        decodedToken.uid,
        ServerToClientEvent.UserConnected,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Socket ${socket.id}: Authentification échouée - ${error.message}`
      );
      return false;
    }
  }

  private isAuthenticated(socket: Socket): boolean {
    return socket.data?.isAuthenticated === true;
  }

  private getUserId(socket: Socket): string | null {
    return socket.data?.userId || null;
  }

  private getUsername(socket: Socket): string | null {
    return socket.data?.username || null;
  }

  emit(event: string, data: any = null) {
    if (this.server) this.server.sockets.emit(event, data);
  }

  // Helper method to update socket client data from HTTP endpoint
  modifyClientData(
    userId: string,
    data: {username: string; avatarURL: string; email: string}
  ) {
    const sockets = this.getSocketsByUid(userId);
    sockets.forEach((socket) => {
      socket.data = {...socket.data, ...data};
    });
  }

  @SubscribeMessage(ClientToServerEvent.Typing)
    async onTyping(
      client: Socket,
      payload: { roomId: string, type: MessageType }
    ) {
      const userId = client.data.userId;
      if (!userId) {
        return;
      } 

      this.friendService.broadcastTyping(
        this.server,
        userId,
        payload.roomId,
        payload.type
      );
    }

  @SubscribeMessage(ClientToServerEvent.StopTyping)
    async onStopTyping(
      client: Socket,
      payload: { roomId: string, type: MessageType }
    ) {
      const userId = client.data.userId;
      if (!userId){
        return;
      } 

      this.friendService.broadcastStopTyping(
        this.server,
        userId,
        payload.roomId,
        payload.type
      );
    }

}
