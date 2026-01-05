import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrivateRoom, PrivateRoomSchema } from '@app/model/schema/private-room.schema';
import { PrivateRoomService } from '@app/services/private-room/private-room.service';
import { PrivateRoomController } from '@app/controllers/private-room/private-room.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PrivateRoom.name, schema: PrivateRoomSchema }
        ])
    ],
    controllers: [PrivateRoomController],
    providers: [PrivateRoomService],
    exports: [PrivateRoomService]
})
export class PrivateRoomModule {}