import { Module } from '@nestjs/common';
import { WaitingRoomsController } from '@app/controllers/waiting-rooms/waiting-rooms.controller';
import { RoomModule } from '@app/modules/room/room.module';

@Module({
  imports: [RoomModule],
  controllers: [WaitingRoomsController],
})
export class WaitingRoomsModule {}