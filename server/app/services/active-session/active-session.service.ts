import { ActiveSession } from '@app/interfaces/active-session';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { CONSTANTS } from '@common/constants';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { GameSessionEvents } from '@common/event-enums/gameSession.gateway.events';
import { Item } from '@common/interfaces/item';
import { Player } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { ItemEnum } from '@common/item-enum';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ActiveSessionService {
    activeSessions: Map<string, ActiveSession> = new Map();

    constructor(
        private timerService: GameTimerService,
        private infoService: GameInfoService,
    ) {}

    initialiseGame(room: Room, server: Server): ActiveSession {
        if (this.activeSessions.has(room.code)) return this.activeSessions.get(room.code);
        const newSession = this.createSession(room, server);
        this.activeSessions.set(room.code, newSession);
        server.to(room.code).emit(GameLogicEvents.StartGame);
        this.orderPlayersBySpeed(newSession);
        server.to(room.code).emit(GameSessionEvents.PlayersUpdate, newSession.room.players);
        newSession.movementUnlocked = true;
        newSession.room.isActive = true;
        this.infoService.initialisePlayerStats(room.code, room.players);
        return newSession;
    }

    endSession(session: ActiveSession): void {
        session.room.isActive = false;
        this.activeSessions.delete(session.room.code);
    }

    getCurrentPlayerId(roomId: string): string {
        const session = this.activeSessions.get(roomId);
        if (session) {
            return session.room.players[session.turnIndex].socketId;
        }
        return '';
    }

    addRejectedItem(socketId: string, session: ActiveSession, item: Item) {
        const player = session.room.players.find((inRoomPlayer: Player) => inRoomPlayer.socketId === socketId);
        const pos = player.position;
        const map = session.room.map;
        if (!player || !map) return;

        map._tiles[pos.y][pos.x].item = item;
        session.server.to(session.room.code).emit(GameLogicEvents.UpdateMap, map);
        if (item.itemType === ItemEnum.Flag) {
            player.hasFlag = false;
            session.server.to(session.room.code).emit(GameLogicEvents.UpdateFlag, player);
        }
    }

    private createSession(room: Room, server: Server): ActiveSession {
        return {
            server,
            room,
            turnIndex: -1,
            timer: this.timerService.createTimer(CONSTANTS.ROUND_SECONDS_LENGTH, CONSTANTS.MS_TO_SECONDS_CONVERSION),
            startTime: new Date(),
            turnActive: false,
        };
    }

    private orderPlayersBySpeed(session: ActiveSession) {
        session.room.players.sort((a, b) => {
            const diff = b.attributes.speedPoints - a.attributes.speedPoints;
            if (diff === 0) {
                return Math.random() - CONSTANTS.HALF_CHANCE;
            }
            return diff;
        });
    }
}
