import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrivateRoom, PrivateRoomRole, PrivateRoomMember } from '@app/model/schema/private-room.schema';
import { Server } from 'socket.io';
import { UserAccount } from '@common/interfaces/user-account';
import * as admin from 'firebase-admin'
import { NotFoundException } from '@nestjs/common';
import { ServerToClientEvent } from '@common/socket.events';

export interface CreatePrivateRoomDto {
    name: string;
    ownerId: string;
    ownerUsername: string;
}

export interface JoinPrivateRoomDto {
    roomId: string;
    userId: string;
    username: string;
}

@Injectable()
export class PrivateRoomService {
    private server?: Server;

    setServer(server: Server) {
        this.server = server;
    }

    constructor(
        @InjectModel(PrivateRoom.name) private privateRoomModel: Model<PrivateRoom>
    ) {}

    async createPrivateRoom(createRoomDto: CreatePrivateRoomDto): Promise<PrivateRoom> {
        const normalizedName = createRoomDto.name.trim().toLowerCase(); 

        const existing = await this.privateRoomModel.findOne({
            name: {$regex: new RegExp(`^${normalizedName}`, 'i')},
            isActive: true,
        });

        if (existing) {
            throw new BadRequestException(`un canal nomme "${createRoomDto.name}" existe deja`)
        }
        
        const roomId = this.generateRoomId();
        
        const owner: PrivateRoomMember = {
            userId: createRoomDto.ownerId,
            username: createRoomDto.ownerUsername,
            role: PrivateRoomRole.OWNER,
            joinedAt: new Date()
        };

        const privateRoom = new this.privateRoomModel({
            roomId,
            name: createRoomDto.name,
            ownerId: createRoomDto.ownerId,
            members: [owner],
            isActive: true,
            lastActivity: new Date()
        });

        return privateRoom.save();
    }


    async getUserRooms(userId: string): Promise<PrivateRoom[]> {
        return this.privateRoomModel.find({
            'members.userId': userId,
            isActive: true
        }).sort({ lastActivity: -1 });
    }

    async getAllAvailableRooms(excludeUserId?: string): Promise<PrivateRoom[]> {
        let query: any = { isActive: true };
        
        if (excludeUserId) {
            query = {
                isActive: true,
                'members.userId': { $ne: excludeUserId }
            };
        }
        
        return this.privateRoomModel.find(query).sort({ lastActivity: -1 });
    }

    async joinRoom(joinDto: JoinPrivateRoomDto): Promise<PrivateRoom | null> {
        const room = await this.privateRoomModel.findOne({ 
            roomId: joinDto.roomId,
            isActive: true 
        });

        if (!room) {
            throw new Error('Salle introuvable');
        }

        const existingMember = room.members.find(m => m.userId === joinDto.userId);
        if (existingMember) {
            throw new Error('Vous êtes déjà membre de cette salle');
        }

        const newMember: PrivateRoomMember = {
            userId: joinDto.userId,
            username: joinDto.username,
            role: PrivateRoomRole.MEMBER,
            joinedAt: new Date()
        };

        room.members.push(newMember);
        room.lastActivity = new Date();

        return room.save();
    }

    async leaveRoom(roomId: string, userId: string): Promise<{ room: PrivateRoom, deleted: boolean }> {
    const room = await this.privateRoomModel.findOne({ roomId, isActive: true });
    if (!room) throw new NotFoundException('Canal introuvable.');

    room.members = room.members.filter(m => m.userId !== userId);

    if (room.ownerId === userId) {
      if (room.members.length > 0) {
        const randomIndex = Math.floor(Math.random() * room.members.length);
        const newOwner = room.members[randomIndex];
        room.ownerId = newOwner.userId;

        room.members = room.members.map(m => ({
          ...m,
          role: m.userId === newOwner.userId ? PrivateRoomRole.OWNER : PrivateRoomRole.MEMBER,
        }));

        if (this.server) {
          await this.notifyRoomMembers(
            this.server,
            roomId,
            'NewOwnerAssigned',
            {
              roomId,
              roomName: room.name,
              newOwnerId: newOwner.userId,
              newOwnerUsername: newOwner.username,
            },
            userId
          );
        }
      } else {
        room.isActive = false;
      }
    }

    await room.save();

    return {
      room,
      deleted: room.members.length === 0
    };
  }




    async getRoom(roomId: string): Promise<PrivateRoom | null> {
        return this.privateRoomModel.findOne({ 
            roomId,
            isActive: true 
        });
    }

    async hasAccess(roomId: string, userId: string): Promise<boolean> {
        const room = await this.privateRoomModel.findOne({
            roomId,
            'members.userId': userId,
            isActive: true
        });
        return !!room;
    }

    async deleteRoom(roomId: string, userId: string): Promise<boolean> {
        const room = await this.privateRoomModel.findOne({ roomId, isActive: true });
        if (!room) throw new Error('Salle introuvable');
        if (room.ownerId !== userId) throw new Error('Seul le propriétaire peut supprimer la salle');

        const members = [...room.members];

        room.isActive = false;
        await room.save();

        if (this.server) {

            await this.notifyUsers(
            this.server,
            members.map(m => m.userId),       
            ServerToClientEvent.PrivateRoomDeleted,
            { roomId, roomName: room.name, deletedBy: userId },
            userId                                 
            )
        }

        return true;
        }

    private async notifyUsers(
        server: Server,
        userIds: string[],
        event: string,
        data: any,
        excludeUserId?: string
        ): Promise<void> {
        const targets = new Set(userIds.filter(uid => !excludeUserId || uid !== excludeUserId));
        for (const [_, socket] of server.sockets.sockets) {
            const sid = socket.data?.userId ?? socket.data?.uid;
            if (sid && targets.has(sid)) {
            socket.emit(event, data);
            }
        }
        }


    async updateLastActivity(roomId: string): Promise<void> {
        await this.privateRoomModel.updateOne(
            { roomId, isActive: true },
            { lastActivity: new Date() }
        );
    }

    async notifyRoomMembers(
        server: Server,
        roomId: string,
        event: string,
        data: any,
        excludeUserId?: string
    ): Promise<void> {
        const room = await this.getRoom(roomId);
        if (!room) return;

        for (const member of room.members) {
            if (excludeUserId && member.userId === excludeUserId) continue;

            for (const [_, socket] of server.sockets.sockets) {
                if (socket.data?.userId === member.userId) {
                    socket.emit(event, data);
                }
            }
        }
    }

    async getRoomMembers(roomId: string): Promise<{ uid: string; username: string }[]> {
        const room = await this.privateRoomModel.findOne({ roomId, isActive: true });
        if (!room) return [];
        return room.members.map(member => ({
            uid: member.userId,
            username: member.username,
        }));
    }

    async getUserByUid(uid: string): Promise<(UserAccount & { blockedUsers?: string[] }) | null> {
        try {
            const userDoc = await admin.firestore().collection('users').doc(uid).get();
            if (!userDoc.exists) return null;
            return userDoc.data() as UserAccount;
        } catch (error) {
            console.error(`Erreur lors de la récupération de l’utilisateur ${uid}:`, error);
            return null;
        }
    }

    private generateRoomId(): string {
        return `private_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async isBlockedBetween(aUid: string, bUid: string): Promise<boolean> {

        const [a, b] = await Promise.all([
            this.getUserByUid(aUid),
            this.getUserByUid(bUid),
        ]);

        if (!a || !b) {
            return false;
        }

        const extractUids = (list: any[] | undefined, ownerUid: string): string[] => {
            if (!Array.isArray(list)) {
                return [];
            }
            const uids = list.map((entry: any) => (typeof entry === 'string' ? entry : entry?.uid)).filter(Boolean);
            return uids;
        };

        const aBlocked = extractUids(a.blockedUsers, aUid);
        const bBlocked = extractUids(b.blockedUsers, bUid);

        const aBlocksB = aBlocked.includes(bUid);
        const bBlocksA = bBlocked.includes(aUid);

        const result = aBlocksB || bBlocksA;

        return result;
    }
}