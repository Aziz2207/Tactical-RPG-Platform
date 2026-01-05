import { IMessage } from '@app/interfaces/message.interface';
import { Message } from '@app/model/schema/message.schema';
import { ChatService } from '@app/services/chat/chat.service';
import { MessageType } from '@common/interfaces/message-type';
import { Controller, Get, HttpStatus, Query, Res, Headers } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Response } from 'express';

@Controller('chat')
export class ChatController {
    constructor(
        private chatService: ChatService,
    ) {}

    @ApiOkResponse({
        description: 'Returns messages',
        type: Message,
        isArray: true,
    })
    @Get()
    async getMessages(@Query('type') type: MessageType, @Query('roomCode') roomCode?: string, @Res() response?: Response, @Headers('Authorization') authHeader?: string) {
        try {
            if (type === MessageType.ROOM && !roomCode) {
                return response
                    .status(HttpStatus.BAD_REQUEST)
                    .send('roomCode is required for ROOM messages');
            }

            const messages = await this.chatService.getMessagesByType(type, roomCode);
            return response.status(HttpStatus.OK).json(messages);
        } catch (error) {
            console.error('[ChatController] getMessages error:', error);
            return response.status(HttpStatus.BAD_REQUEST).send(error.message);
        }
    }
}
