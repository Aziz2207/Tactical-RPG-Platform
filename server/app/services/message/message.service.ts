import { IMessage } from '@app/interfaces/message.interface';
import { ChatService } from '@app/services/chat/chat.service';
import { RoomService } from '@app/services/room/room.service';
import { PrivateRoomService } from '@app/services/private-room/private-room.service';
import { GameService } from '@app/services/game/game.service';
import { UserService } from '@app/services/user/user.service';
import { ServerToClientEvent } from '@common/socket.events';
import { MessageType } from '@common/interfaces/message-type';
import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
export class MessageService {
    constructor(
        private chatService: ChatService,
        private roomService: RoomService,
        private privateRoomService: PrivateRoomService,
        @Inject(forwardRef(() => GameService))
        private gameService: GameService,
        private userService: UserService,
    ) {}

    async onMessageReceived(client: Socket, server: Server, message: IMessage) {
        if (!client.data?.isAuthenticated) {
            client.emit(ServerToClientEvent.ErrorMessage, 'Non authentifié - connexion requise');
            return;
        }

        const storedUsername = client.data.username;
        const storedAvatarURL = client.data.avatarURL;
        const authenticatedUserId = client.data.userId;

        if (!authenticatedUserId) {
            client.emit(ServerToClientEvent.ErrorMessage, 'Informations utilisateur manquantes');
            return;
        }

        const { username: resolvedUsername, avatarURL: resolvedAvatarURL } = await this.resolveUserIdentity(
            authenticatedUserId,
            { username: storedUsername, avatarURL: storedAvatarURL }
        );

        if (!resolvedUsername) {
            client.emit(ServerToClientEvent.ErrorMessage, "Impossible d'identifier l'utilisateur");
            return;
        }

        if (storedUsername !== resolvedUsername) {
            client.data.username = resolvedUsername;
        }

        if (storedAvatarURL !== resolvedAvatarURL) {
            client.data.avatarURL = resolvedAvatarURL;
        }

        const serverTimestamp = new Date();
        let processedMessage: IMessage;

        switch (message.type) {
            case MessageType.GLOBAL:
                processedMessage = {
                    ...message,
                    roomId: 'global',
                    username: resolvedUsername,
                    avatarURL: resolvedAvatarURL ?? undefined,
                    senderUid: authenticatedUserId,
                    timestamp: serverTimestamp,
                };
                break;

            case MessageType.PRIVATE: {
                if (!message.roomId) {
                    client.emit(ServerToClientEvent.ErrorMessage, 'roomId manquant pour un message privé');
                    return;
                }

                const hasAccess = await this.privateRoomService.hasAccess(message.roomId, authenticatedUserId);
                if (!hasAccess) {
                    client.emit(ServerToClientEvent.ErrorMessage, 'Accès refusé à ce canal privé');
                    return;
                }

                processedMessage = {
                    ...message,
                    roomId: message.roomId,
                    username: resolvedUsername,
                    avatarURL: resolvedAvatarURL ?? undefined,
                    senderUid: authenticatedUserId,
                    timestamp: serverTimestamp,
                };
                await this.privateRoomService.updateLastActivity(message.roomId);
                break;
            }

            case MessageType.ROOM: {
                const room = this.roomService.getRoom(client);

                if (!room || room.roomId !== message.roomId) {
                    client.emit(ServerToClientEvent.ErrorMessage, "Impossible d'envoyer un message dans cette salle");
                    return;
                }

                processedMessage = {
                    ...message,
                    roomId: room.roomId,
                    username: resolvedUsername,
                    avatarURL: resolvedAvatarURL ?? undefined,
                    senderUid: authenticatedUserId,
                    timestamp: serverTimestamp,
                };

                break;
            }

            case MessageType.SPECTATOR: {
                const room = this.roomService.getRoom(client);

                if (!room || room.roomId !== message.roomId) {
                    client.emit(ServerToClientEvent.ErrorMessage, "Impossible d'envoyer un message dans cette salle");
                    return;
                }

                processedMessage = {
                    ...message,
                    roomId: room.roomId,
                    username: resolvedUsername,
                    avatarURL: resolvedAvatarURL ?? undefined,
                    senderUid: authenticatedUserId,
                    timestamp: serverTimestamp,
                };

                break;
            }

            default:
                throw new Error(`Type de message non supporté: ${message.type}`);
        }

        await this.saveMessage(client, server, processedMessage);
    }


    async saveMessage(client: Socket, server: Server, message: IMessage) {

        try {
            const savedMessage = await this.chatService.saveMessage(message);

            const normalized = {
                message: savedMessage.message,
                username: savedMessage.username,
                avatarURL: savedMessage.avatarURL,
                senderUid: savedMessage.senderUid,
                timestamp: savedMessage.timestamp,
                roomId: message.roomId,
                type: message.type,
            };

            switch (message.type) {
                case MessageType.GLOBAL: {
                    const senderUid = normalized.senderUid!;
                    for (const [_, socket] of server.sockets.sockets) {
                        const uid = socket.data?.userId;
                        if (!uid) continue;
                        const blocked = await this.privateRoomService.isBlockedBetween(senderUid, uid);
                        if (!blocked) {
                            socket.emit(ServerToClientEvent.MessageReceived, normalized);
                        }
                    }
                    break;
                }

                case MessageType.PRIVATE: { 
                    const senderUid = normalized.senderUid!;
                    const members = await this.privateRoomService.getRoomMembers(normalized.roomId!);

                    for (const [_, socket] of server.sockets.sockets) {
                        if (socket.data?.userId === senderUid) {
                            socket.emit(ServerToClientEvent.MessageReceived, normalized);
                            break;
                        }
                    }

                    for (const member of members) {
                        if (member.uid === senderUid) continue;
                            const blockedA = await this.privateRoomService.isBlockedBetween(senderUid, member.uid);
                            const blockedB = await this.privateRoomService.isBlockedBetween(member.uid, senderUid);
                            if (blockedA || blockedB){
                                continue;
                            }

                        for (const [_, socket] of server.sockets.sockets) {
                            if (socket.data?.userId === member.uid) {
                                socket.emit(ServerToClientEvent.MessageReceived, normalized);
                            }
                        }
                    }
                    break;
                }
                case MessageType.ROOM: {
                    const senderUid = normalized.senderUid!;

                    const socketsInRoom = await server.in(normalized.roomId!).fetchSockets();

                    for (const socket of socketsInRoom) {
                        const targetUid = socket.data?.userId;
                        if (!targetUid) continue;

                        if (this.gameService.isSpectatorById(socket.id)) continue;

                        const blocked = await this.privateRoomService.isBlockedBetween(senderUid, targetUid);
                        if (!blocked) {
                            socket.emit(ServerToClientEvent.MessageReceived, normalized);
                        }
                    }
                    break;
                }

                case MessageType.SPECTATOR: {
                    const senderUid = normalized.senderUid!;

                    const socketsInRoom = await server.in(normalized.roomId!).fetchSockets();

                    for (const socket of socketsInRoom) {
                        const targetUid = socket.data?.userId;
                        if (!targetUid) continue;

                        if (!this.gameService.isSpectatorById(socket.id)) continue;

                        const blocked = await this.privateRoomService.isBlockedBetween(senderUid, targetUid);
                        if (!blocked) {
                            socket.emit(ServerToClientEvent.MessageReceived, normalized);
                        }
                    }
                    break;
                }

                default:
                    throw new Error(`Type de message non supporté: ${message.type}`);
            }
        } catch (error) {
            client.emit(
                ServerToClientEvent.ErrorMessage,
                `Échec de l’envoi du message ${message.type}: ${error.message}`,
            );
        }
    }

    private async resolveUserIdentity(
        userId: string,
        fallback?: { username?: string | null; avatarURL?: string | null }
    ): Promise<{ username: string | null; avatarURL: string | null }> {
        try {
            const userAccount = await this.userService.getUserAccount(userId);
            if (userAccount) {
                return {
                    username: userAccount.username ?? fallback?.username ?? null,
                    avatarURL: userAccount.avatarURL ?? fallback?.avatarURL ?? null,
                };
            }
        } catch {
            // Ignore errors and fall back to the cached identity
        }

        return {
            username: fallback?.username ?? null,
            avatarURL: fallback?.avatarURL ?? null,
        };
    }
}