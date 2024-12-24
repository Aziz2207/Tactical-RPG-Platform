import { RoomService } from '@app/services/rooms/rooms.service';
import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Rooms')
@Controller('room')
export class RoomController {
    constructor(private readonly roomService: RoomService) {}

    @Get('new')
    async getNewRoomId(@Res() response: Response) {
        try {
            const roomId = this.roomService.generateRoomId();
            response.status(HttpStatus.OK).json({ roomId });
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error.message);
        }
    }

    @Get('exists/:roomId')
    async checkRoomExists(@Param('roomId') roomId: string, @Res() response: Response) {
        const roomExists = this.roomService.checkRoomExists(roomId);
        if (roomExists) {
            response.status(HttpStatus.OK).send();
        } else {
            response.status(HttpStatus.NOT_FOUND).send({ message: 'Undefined room' });
        }
    }
}
