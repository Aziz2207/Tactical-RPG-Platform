import { ActiveSessionService } from '@app/services/active-session/active-session.service';
import { GameControllerService } from '@app/services/game-controller/game-controller.service';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { RoomService } from '@app/services/rooms/rooms.service';
import { TurnService } from '@app/services/turn/turn.service';
import { CONSTANTS } from '@common/constants';
import { CombatEvents } from '@common/event-enums/combat.gateway.events';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { CombatMove } from '@common/interfaces/combat';
import { Item } from '@common/interfaces/item';
import { Position } from '@common/interfaces/position';
import { Injectable } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    namespace: 'gameSession',
    cors: true,
})
@Injectable()
export class GameLogicGateway {
    @WebSocketServer() private server: Server;
    constructor(
        private roomService: RoomService,
        private activeSessionService: ActiveSessionService,
        private infoService: GameInfoService,
        private turnService: TurnService,
        private gameControllerService: GameControllerService,
    ) {}

    @SubscribeMessage(GameLogicEvents.InitialiseGame)
    initialiseGame(socket: Socket, roomCode: string) {
        const room = this.roomService.getRoom(roomCode);
        if (room) {
            const newSession = this.activeSessionService.initialiseGame(room, this.server);
            this.gameControllerService.initialiseGame(newSession, this.server);
            setTimeout(() => {
                newSession.room.isActive = true;
                this.turnService.startNextTurn(newSession, this.server);
            }, CONSTANTS.END_TURN_DELAY);
        }
    }

    @SubscribeMessage(GameLogicEvents.StartGame)
    startGame(socket: Socket, roomCode: string) {
        const session = this.activeSessionService.activeSessions.get(roomCode);
        if (session) this.turnService.startNextTurn(session, this.server);
    }

    @SubscribeMessage(GameLogicEvents.PauseGame)
    pauseGame(socket: Socket, roomCode: string) {
        const session = this.activeSessionService.activeSessions.get(roomCode);
        if (session) {
            this.turnService.pauseTurn(session);
        }
    }

    @SubscribeMessage(GameLogicEvents.ContinueTurn)
    continueTurn(socket: Socket, roomCode: string) {
        const session = this.activeSessionService.activeSessions.get(roomCode);
        if (session) this.turnService.continueTurn(session, this.server);
    }

    @SubscribeMessage(GameLogicEvents.PassTurn)
    passTurn(socket: Socket) {
        const roomCode = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.activeSessionService.activeSessions.get(roomCode);
        if (session && socket.id === this.activeSessionService.getCurrentPlayerId(roomCode)) this.turnService.endTurn(session, this.server);
    }

    @SubscribeMessage(GameLogicEvents.GetInitialLogs)
    handleGetInitialLogs(client: Socket, payload: { roomId: string }) {
        const roomId = payload.roomId;
        const logs = this.infoService.getLogs(roomId);
        client.emit(GameLogicEvents.GetInitialLogs, logs);
    }

    @SubscribeMessage(GameLogicEvents.MovePlayer)
    movePlayer(socket: Socket, path: [number, number][]) {
        const code = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.activeSessionService.activeSessions.get(code);
        if (session && path.length > 0 && session.room.isActive) {
            this.gameControllerService.movePlayer(socket, session, path, this.server);
        }
    }

    @SubscribeMessage(GameLogicEvents.ToggleDebugMode)
    toggleDebugMode(socket: Socket) {
        const code = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.activeSessionService.activeSessions.get(code);
        if (session && session.room.isActive) {
            this.gameControllerService.toggleDebugMode(session, this.server);
        }
    }

    @SubscribeMessage(CombatEvents.StartCombat)
    startCombat(socket: Socket, victimUser: string) {
        const roomCode = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.activeSessionService.activeSessions.get(roomCode);
        if (session) {
            this.gameControllerService.startCombat(session, socket, victimUser, this.server);
        }
    }

    @SubscribeMessage(CombatEvents.CombatMove)
    combatMove(socket: Socket, move: CombatMove) {
        const roomCode = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.activeSessionService.activeSessions.get(roomCode);
        if (session) this.gameControllerService.combatMove(session, this.server, move);
    }

    @SubscribeMessage(GameLogicEvents.ToggleDoor)
    toggleDoor(socket: Socket, position: Position) {
        const code = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.activeSessionService.activeSessions.get(code);
        if (session) this.gameControllerService.toggleDoor(session, socket, position, this.server);
    }

    @SubscribeMessage(GameLogicEvents.RejectedItem)
    addRejectedItem(socket: Socket, item: Item) {
        const code = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.activeSessionService.activeSessions.get(code);
        if (session) {
            this.activeSessionService.addRejectedItem(socket.id, session, item);
        }
    }

    @SubscribeMessage(GameLogicEvents.NewInventory)
    addNewInventory(socket: Socket, inventory: Item[]) {
        const code = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.activeSessionService.activeSessions.get(code);
        if (session) {
            this.gameControllerService.updateInventory(session, socket, inventory, this.server);
        }
    }

    @SubscribeMessage(GameLogicEvents.TeleportPlayer)
    teleportPlayer(socket: Socket, position: Position) {
        const code = this.roomService.getRoomCodeBySocketId(socket.id);
        const session = this.activeSessionService.activeSessions.get(code);
        if (session) {
            this.gameControllerService.teleportPlayerDebug(socket, session, position, this.server);
        }
    }
}
