import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PrivateRoomRole {
    OWNER = 'owner',
    MEMBER = 'member'
}

@Schema({ timestamps: true })
export class PrivateRoomMember {
    @Prop({ type: String, required: true })
    userId: string;

    @Prop({ type: String, required: true })
    username: string;

    @Prop({ type: String, enum: Object.values(PrivateRoomRole), required: true })
    role: PrivateRoomRole;

    @Prop({ type: Date, default: Date.now })
    joinedAt: Date;
}

@Schema({ timestamps: true })
export class PrivateRoom extends Document {
    @Prop({ type: String, required: true, unique: true })
    roomId: string;

    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String, required: true })
    ownerId: string;

    @Prop({ type: [PrivateRoomMember], default: [] })
    members: PrivateRoomMember[];

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    @Prop({ type: Date, default: Date.now })
    lastActivity: Date;
}

export const PrivateRoomSchema = SchemaFactory.createForClass(PrivateRoom);
export const PrivateRoomMemberSchema = SchemaFactory.createForClass(PrivateRoomMember);