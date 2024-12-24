import { ActiveSessionService } from '@app/services/active-session/active-session.service';
import { GameControllerService } from '@app/services/game-controller/game-controller.service';
import { RoomService } from '@app/services/rooms/rooms.service';
import { TurnService } from '@app/services/turn/turn.service';
import { GameSessionEvents } from '@common/event-enums/gameSession.gateway.events';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Injectable, Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    namespace: 'gameSession',
    cors: true,
})
@Injectable()
export class GameSessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() private server: Server;

    constructor(
        private readonly logger: Logger,
        private roomService: RoomService,
        private sessionService: ActiveSessionService,
        private gameControllerService: GameControllerService,
        private turnService: TurnService,
    ) {}

    @SubscribeMessage(GameSessionEvents.CreateRoom)
    createRoom(socket: Socket, map: Map) {
        const roomId = this.roomService.generateRoomId();
        this.roomService.createRoom(roomId, socket, map);
    }

    @SubscribeMessage(GameSessionEvents.JoinRoom)
    joinRoom(socket: Socket, roomId: string) {
        this.roomService.joinRoom(roomId, socket);
    }

    @SubscribeMessage(GameSessionEvents.LeaveRoom)
    leaveRoom(socket: Socket) {
        this.handleDisconnect(socket);
    }

    @SubscribeMessage('updatePlayerInfo')
    updatePlayeInfo(socket: Socket, player: Player): void {
        this.roomService.updatePlayerInfo(player, socket);
    }

    @SubscribeMessage('removePlayer')
    removePlayer(socket: Socket, data: { roomId: string; playerId: string }) {
        this.roomService.removePlayer(data.roomId, data.playerId, socket);
    }

    @SubscribeMessage('toggleLock')
    toggleRoomLock(socket: Socket, data: { roomId: string; isLocked: boolean }) {
        this.roomService.toggleRoomLock(data.roomId, data.isLocked, socket);
    }

    @SubscribeMessage('addVirtualPlayer')
    addVirtualPlayer(socket: Socket, data: { roomId: string; isAgressive: boolean }) {
        this.roomService.addVirtualPlayer(data.roomId, data.isAgressive, socket);
    }

    @SubscribeMessage('playerLeftEndGameView')
    handlePlayerLeftEndGameView(socket: Socket): void {
        const roomCode = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.sessionService.activeSessions.get(roomCode);
        if (session && session.playersInEndGameView) {
            session.playersInEndGameView.delete(socket.id);
            if (session.playersInEndGameView.size <= 0) {
                this.sessionService.endSession(session);
            }
        }
    }

    handleConnection(socket: Socket) {
        this.logger.log(`Connexion par l'utilisateur avec id : ${socket.id}`);
    }

    handleDisconnect(socket: Socket) {
        this.logger.log(`Déconnexion par l'utilisateur avec id : ${socket.id}`);
        const roomCode = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.sessionService.activeSessions.get(roomCode);
        const player = this.roomService.findPlayerBySocketId(roomCode, socket.id);
        if (player && session) {
            this.gameControllerService.handleDisconnectionCombat(session, player, this.server);
            this.turnService.handlePlayerExit(player, session, this.server);
            this.gameControllerService.handleDisconnectionInventory(session, player, this.server);
        }
        this.roomService.leaveRoom(roomCode, socket, this.server);
    }
}
