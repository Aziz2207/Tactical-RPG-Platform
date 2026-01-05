import { Controller, Get, Logger } from '@nestjs/common';
import { RoomService } from '@app/services/room/room.service';

@Controller('waiting-rooms')
export class WaitingRoomsController {
  private readonly logger = new Logger(WaitingRoomsController.name);

  constructor(private readonly roomService: RoomService) {}

  @Get()
  async getWaitingRooms() {
    const rooms = await this.roomService.getWaitingRooms();
    return rooms;
  }
}