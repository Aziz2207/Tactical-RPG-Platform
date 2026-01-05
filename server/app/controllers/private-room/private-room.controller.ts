import { Controller, Post, Get, Delete, Body, Param, Query, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrivateRoomService, CreatePrivateRoomDto, JoinPrivateRoomDto } from '@app/services/private-room/private-room.service';

@ApiTags('private-rooms')
@Controller('private-rooms')
export class PrivateRoomController {
    constructor(private readonly privateRoomService: PrivateRoomService) {}

    @Post()
    @ApiOperation({ summary: 'Créer une nouvelle salle privée' })
    @ApiResponse({ status: 201, description: 'Salle créée avec succès' })
    async createRoom(@Body() createRoomDto: CreatePrivateRoomDto, @Res() response: Response) {
        try {
            const room = await this.privateRoomService.createPrivateRoom(createRoomDto);
            return response.status(HttpStatus.CREATED).json(room);
        } catch (error) {
            return response.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
        }
    }

    @Post(':roomId/join')
    @ApiOperation({ summary: 'Rejoindre une salle privée' })
    @ApiResponse({ status: 200, description: 'Salle rejointe avec succès' })
    async joinRoom(@Param('roomId') roomId: string, @Body() joinDto: Omit<JoinPrivateRoomDto, 'roomId'>, @Res() response: Response) {
        try {
            const room = await this.privateRoomService.joinRoom({
                ...joinDto,
                roomId
            });
            return response.status(HttpStatus.OK).json(room);
        } catch (error) {
            return response.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
        }
    }


    @Post(':roomId/leave')
    @ApiOperation({ summary: 'Quitter une salle privée' })
    @ApiResponse({ status: 200, description: 'Salle quittée avec succès' })
    async leaveRoom(
        @Param('roomId') roomId: string,
        @Body() { userId }: { userId: string },
        @Res() response: Response
        ) {
        try {
            const result = await this.privateRoomService.leaveRoom(roomId, userId);

            return response.status(HttpStatus.OK).json({
            message: result.room.isActive
                ? 'Salle quittée avec succès'
                : 'Salle supprimée (propriétaire quitté)',
            room: result.room,
            deleted: !result.room.isActive
            });
        } catch (error) {
            return response.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
        }
    }


    @Get()
    @ApiOperation({ summary: 'Obtenir toutes les salles privées disponibles' })
    @ApiResponse({ status: 200, description: 'Liste de toutes les salles privées' })
    async getAllRooms(@Res() response: Response, @Query('excludeUserId') excludeUserId?: string) {
        try {
            const rooms = await this.privateRoomService.getAllAvailableRooms(excludeUserId);
            return response.status(HttpStatus.OK).json(rooms);
        } catch (error) {
            return response.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
        }
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Obtenir toutes les salles d\'un utilisateur' })
    @ApiResponse({ status: 200, description: 'Liste des salles de l\'utilisateur' })
    async getUserRooms(@Param('userId') userId: string, @Res() response: Response) {
        try {
            const rooms = await this.privateRoomService.getUserRooms(userId);
            return response.status(HttpStatus.OK).json(rooms);
        } catch (error) {
            return response.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
        }
    }

    @Get(':roomId')
    @ApiOperation({ summary: 'Obtenir les détails d\'une salle privée' })
    @ApiResponse({ status: 200, description: 'Détails de la salle' })
    async getRoom(@Param('roomId') roomId: string, @Res() response: Response) {
        try {
            const room = await this.privateRoomService.getRoom(roomId);
            if (!room) {
                return response.status(HttpStatus.NOT_FOUND).json({ error: 'Salle introuvable' });
            }
            return response.status(HttpStatus.OK).json(room);
        } catch (error) {
            return response.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
        }
    }

    @Delete(':roomId')
    @ApiOperation({ summary: 'Supprimer une salle privée' })
    @ApiResponse({ status: 200, description: 'Salle supprimée avec succès' })
    async deleteRoom(
        @Param('roomId') roomId: string,
        @Query('userId') userId: string,
        @Res() response: Response
    ) {
        try {
            await this.privateRoomService.deleteRoom(roomId, userId);
            return response.status(HttpStatus.OK).json({ message: 'Salle supprimée avec succès' });
        } catch (error) {
            return response.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
        }
    }
}