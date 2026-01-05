import {Injectable, Logger} from "@nestjs/common";
import {Server, Socket} from "socket.io";
import {UserService} from "../user/user.service";
import {RoomService} from "../room/room.service";
import {ServerToClientEvent} from "@common/socket.events";
import { MessageType } from '@common/interfaces/message-type';

@Injectable()
export class FriendService {
  private readonly logger = new Logger(FriendService.name);

  constructor(
    private readonly userService: UserService,
    private readonly roomService: RoomService
  ) {}

  async getAllUsers(
    client: Socket,
    server: Server,
    uid: string
  ): Promise<void> {
    try {
      const users = await this.userService.getVisibleUsers(uid);
      await this.notifyUser(server, uid, ServerToClientEvent.AllUsers, users);
    } catch (error) {
      this.emitError(
        client,
        `Erreur lors de la récupération des utilisateurs: ${error.message}`
      );
    }
  }

  async sendFriendRequest(
    client: Socket,
    server: Server,
    receiverUid: string
  ): Promise<void> {
    try {
      const senderUid = client.data.userId;
      const result = await this.userService.sendFriendRequest(
        senderUid,
        receiverUid
      );

      await this.notifyUser(
        server,
        senderUid,
        ServerToClientEvent.FriendRequestSent,
        {
          receiverUid,
          result,
        }
      );

      await this.notifyUser(
        server,
        receiverUid,
        ServerToClientEvent.FriendRequestReceived,
        {
          senderUid,
          senderInfo: await this.userService.getUserAccount(senderUid),
        }
      );

      this.logger.log(
        `Friend request sent from ${senderUid} to ${receiverUid}`
      );
    } catch (error) {
      this.emitError(
        client,
        `Erreur lors de l'envoi de la demande d'ami: ${error.message}`
      );
    }
  }

  async acceptFriendRequest(
    client: Socket,
    server: Server,
    requesterUid: string
  ): Promise<void> {
    try {
      const accepterUid = client.data.userId;
      const result = await this.userService.acceptFriendRequest(
        accepterUid,
        requesterUid
      );

      await this.notifyUser(
        server,
        accepterUid,
        ServerToClientEvent.FriendRequestAccepted,
        {
          requesterUid,
          result,
        }
      );

      await this.notifyUser(
        server,
        requesterUid,
        ServerToClientEvent.FriendRequestAcceptedByUser,
        {
          accepterUid,
          accepterInfo: await this.userService.getUserAccount(accepterUid),
          result
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      await this.updateFriendsListForUser(server, accepterUid);
      await this.updateFriendsListForUser(server, requesterUid);

      this.logger.log(
        `Friend request accepted: ${requesterUid} and ${accepterUid} are now friends`
      );
    } catch (error) {
      this.emitError(
        client,
        `Erreur lors de l'acceptation de la demande d'ami: ${error.message}`
      );
    }
  }

  async rejectFriendRequest(
    client: Socket,
    server: Server,
    requesterUid: string
  ): Promise<void> {
    try {
      const rejecterUid = client.data.userId;
      const result = await this.userService.rejectFriendRequest(
        rejecterUid,
        requesterUid
      );

      await this.notifyUser(
        server,
        rejecterUid,
        ServerToClientEvent.FriendRequestRejected,
        {
          requesterUid,
          result,
        }
      );

      await this.notifyUser(
        server,
        requesterUid,
        ServerToClientEvent.FriendRequestRejectedByUser,
        {
          rejecterUid,
        }
      );

      this.logger.log(
        `Friend request rejected: ${requesterUid} by ${rejecterUid}`
      );
    } catch (error) {
      this.emitError(
        client,
        `Erreur lors du rejet de la demande d'ami: ${error.message}`
      );
    }
  }

  async getFriendRequests(client: Socket, server: Server): Promise<void> {
    try {
      const userId = client.data.userId;
      const friendRequests = await this.userService.getFriendRequests(userId);
      await this.notifyUser(
        server,
        userId,
        ServerToClientEvent.FriendRequests,
        friendRequests
      );
    } catch (error) {
      this.emitError(
        client,
        `Erreur lors de la récupération des demandes d'ami: ${error.message}`
      );
    }
  }

    async getFriends(client: Socket, server: Server): Promise<void> {
        try {
            const userId = client.data.userId;
            const friends = await this.userService.getFriends(userId);

            const onlineMap = this.userService.getOnlineStatus(
            friends.map(f => f.uid)
            );

            const friendsWithStatus = friends.map(f => ({
            ...f,
            isOnline: onlineMap[f.uid] || false
            }));

            client.emit(ServerToClientEvent.Friends, friendsWithStatus);
            await this.notifyUser(
              server,
              userId,
              ServerToClientEvent.Friends,
              friends
            );
        } catch (error) {
            this.emitError(
            client,
            `Erreur lors de la récupération des amis: ${error.message}`
            );
        }
    }

    async getOnlineFriends(client: Socket): Promise<void> {
        try {
            const userId = client.data.userId;
            const friends = await this.userService.getFriends(userId);
            const onlineMap = this.userService.getOnlineStatus(
                friends.map(f => f.uid)
            );
            
            client.emit(ServerToClientEvent.OnlineFriends, onlineMap);
        } catch (error) {
            this.emitError(
                client,
                `Erreur lors de la récupération des amis en ligne: ${error.message}`
            );
        }
    }

  async removeFriend(
    client: Socket,
    server: Server,
    friendUid: string
  ): Promise<void> {
    try {
      const userId = client.data.userId;
      const result = await this.userService.removeFriend(userId, friendUid);

      await this.notifyUser(server, userId, ServerToClientEvent.FriendRemoved, {
        friendUid,
        result,
      });

      await this.notifyUser(
        server,
        friendUid,
        ServerToClientEvent.RemovedAsFriend,
        {
          removedByUid: userId,
          removedByInfo: await this.userService.getUserAccount(userId),
        }
      );

      await this.updateFriendsListForUser(server, userId);
      await this.updateFriendsListForUser(server, friendUid);

      this.logger.log(`Friend removed: ${userId} removed ${friendUid}`);
    } catch (error) {
      this.emitError(
        client,
        `Erreur lors de la suppression de l'ami: ${error.message}`
      );
    }
  }

  async searchUsers(
    client: Socket,
    server: Server,
    username: string
  ): Promise<void> {
    try {
      const userId = client.data.userId;
      const searchResults = await this.userService.searchUsersByUsername(
        username
      );
      await this.notifyUser(
        server,
        userId,
        ServerToClientEvent.UserSearchResults,
        searchResults
      );
    } catch (error) {
      this.emitError(
        client,
        `Erreur lors de la recherche d'utilisateurs: ${error.message}`
      );
    }
  }

  async getAdminFriends(
    client: Socket,
    server: Server,
    roomId: string
  ): Promise<void> {
    try {
      const userId = client.data.userId;
      const room = this.roomService.getRoom({
        data: {roomCode: roomId},
      } as Socket);

      if (!room) {
        throw new Error("Room not found");
      }

      const sockets = await server.fetchSockets();
      const adminSocket = sockets.find((socket) => socket.id === room.adminId);

      if (!adminSocket || !adminSocket.data.userId) {
        throw new Error("Admin not found or not authenticated");
      }

      const adminFriends = await this.userService.getFriends(
        adminSocket.data.userId
      );
      await this.notifyUser(
        server,
        userId,
        ServerToClientEvent.AdminFriends,
        adminFriends
      );
    } catch (error) {
      this.emitError(client, `Error getting admin friends: ${error.message}`);
    }
  }

  private async notifyUser(
    server: Server,
    userId: string,
    event: ServerToClientEvent,
    data: any
  ): Promise<void> {
    const sockets = await server.fetchSockets();
    const userSockets = sockets.filter(
      (socket) => socket.data.userId === userId
    );
    userSockets.forEach((userSocket) => {
      userSocket.emit(event, data);
    });
  }

  private async updateFriendsListForUser(
    server: Server,
    userId: string
  ): Promise<void> {
    const sockets = await server.fetchSockets();
    const userSockets = sockets.filter(
      (socket) => socket.data.userId === userId
    );
     const friends = await this.userService.getFriends(userId);
      const onlineMap = this.userService.getOnlineStatus(
        friends.map(f => f.uid)
      );

      const friendsWithStatus = friends.map(f => ({
        ...f,
        isOnline: onlineMap[f.uid] || false
      }));
    userSockets.forEach((userSocket) => {
      userSocket.emit(ServerToClientEvent.FriendsUpdated, friendsWithStatus);
    });
  }

  private emitError(client: Socket, message: string): void {
    client.emit(ServerToClientEvent.ErrorMessage, message);
  }

  async blockUser(
    client: Socket,
    server: Server,
    blockedUid: string
  ): Promise<void> {
    try {
      const blockerUid = client.data.userId;

      const blockerData = await this.userService.getUserAccount(blockerUid);
      const areFriends = blockerData?.friends?.includes(blockedUid);

      if (areFriends) {
        await this.removeFriend(client, server, blockedUid);
      }

      await this.userService.blockUser(blockerUid, blockedUid);

      await this.notifyUser(
        server,
        blockerUid,
        ServerToClientEvent.UserBlocked,
        {
          blockedUid,
          result: "success",
        }
      );

      await this.notifyUser(
        server,
        blockedUid,
        ServerToClientEvent.BlockedByUser,
        {
          blockerUid,
        }
      );

      await this.refreshUserListForUser(server, blockerUid);
      await this.refreshUserListForUser(server, blockedUid);

      this.logger.log(`User blocked: ${blockerUid} blocked ${blockedUid}`);
    } catch (error) {
      this.emitError(
        client,
        `Erreur lors du blocage de l'utilisateur: ${error.message}`
      );
    }
  }

  async unblockUser(
    client: Socket,
    server: Server,
    blockedUid: string
  ): Promise<void> {
    try {
      const blockerUid = client.data.userId;
      await this.userService.unblockUser(blockerUid, blockedUid);

      await this.notifyUser(
        server,
        blockerUid,
        ServerToClientEvent.UserUnblocked,
        {
          blockedUid,
          result: "success",
        }
      );

      await this.refreshUserListForUser(server, blockerUid);
      await this.refreshUserListForUser(server, blockedUid);

      this.logger.log(`User unblocked: ${blockerUid} unblocked ${blockedUid}`);
    } catch (error) {
      this.emitError(
        client,
        `Erreur lors du déblocage de l'utilisateur: ${error.message}`
      );
    }
  }

  async getBlockedUsers(client: Socket, server: Server): Promise<void> {
    try {
      const userId = client.data.userId;
      const blockedUsers = await this.userService.getBlockedUsers(userId);
      await this.notifyUser(
        server,
        userId,
        ServerToClientEvent.BlockedUsers,
        blockedUsers
      );
    } catch (error) {
      this.emitError(
        client,
        `Erreur lors de la récupération des utilisateurs bloqués: ${error.message}`
      );
    }
  }

  private async refreshUserListForUser(
    server: Server,
    userId: string
  ): Promise<void> {
    const sockets = await server.fetchSockets();
    const userSockets = sockets.filter(
      (socket) => socket.data.userId === userId
    );
    const users = await this.userService.getVisibleUsers(userId);
    userSockets.forEach((userSocket) => {
      userSocket.emit(ServerToClientEvent.AllUsers, users);
    });
  }

    async notifyFriendsAboutStatus(
        server: Server,
        userId: string,
        event: ServerToClientEvent
        ) {
        const friends = await this.userService.getFriends(userId);
        const friendIds = friends.map(f => f.uid);

        const sockets = await server.fetchSockets();

        for (const socket of sockets) {
            if (friendIds.includes(socket.data.userId)) {
                socket.emit(event, { uid: userId });
            }
        }
    }

    async broadcastTyping(
        server: Server,
        senderUid: string,
        roomId: string,
        type: MessageType
        ) {
            const friends = await this.userService.getFriends(senderUid);
            const friendIds = friends.map(f => f.uid);

            const sockets = await server.fetchSockets();

            if (type === MessageType.ROOM) {
                const room = this.roomService.getRoomById(roomId);

                if (!room) return;

                const roomSocketIds = room.listPlayers.map(p => p.id);

                const allowedRecipients = sockets.filter(s => {
                    const isInRoom = roomSocketIds.includes(s.id);
                    const isFriend = friendIds.includes(s.data.userId);
                    return isInRoom && isFriend;
                });

                for (const socket of allowedRecipients) {
                    socket.emit(ServerToClientEvent.UserTyping, {
                        uid: senderUid,
                        roomId,
                        type
                    });
                }
                return;
            }

            for (const socket of sockets) {
                if (!friendIds.includes(socket.data.userId)) continue;
                socket.emit(ServerToClientEvent.UserTyping, {
                uid: senderUid,
                roomId,
                type
                });
            }
    }

    async broadcastStopTyping(
        server: Server,
        senderUid: string,
        roomId: string,
        type: MessageType
        ) {
        const friends = await this.userService.getFriends(senderUid);
        const friendIds = friends.map(f => f.uid);
        
        const sockets = await server.fetchSockets();
        
        if (type === MessageType.ROOM) {
            const room = this.roomService.getRoomById(roomId);
            if (!room) return;
            const roomSocketIds = room.listPlayers.map(p => p.id);
            const allowedRecipients = sockets.filter(s => {
                const isInRoom = roomSocketIds.includes(s.id);
                const isFriend = friendIds.includes(s.data.userId);
                return isInRoom && isFriend;
            });

            for (const socket of allowedRecipients) {
                socket.emit(ServerToClientEvent.UserStopTyping, {
                    uid: senderUid,
                    roomId,
                    type
                });
            }
            return;
        }

        for (const socket of sockets) {
            if (!friendIds.includes(socket.data.userId)) continue;
            socket.emit(ServerToClientEvent.UserStopTyping, {
            uid: senderUid,
            roomId,
            type
            });
        }
    }

}
