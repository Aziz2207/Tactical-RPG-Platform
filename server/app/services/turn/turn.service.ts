import { ActiveSession } from '@app/interfaces/active-session';
import { ActiveSessionService } from '@app/services/active-session/active-session.service';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { TileValidityService } from '@app/services/tile-validity/tile-validity.service';
import { CONSTANTS } from '@common/constants';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { Player } from '@common/interfaces/player';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

@Injectable()
export class TurnService {
    constructor(
        private infoService: GameInfoService,
        private tileValidityService: TileValidityService,
        private timerService: GameTimerService,
        private activeSessionService: ActiveSessionService,
        private eventEmitter: EventEmitter2, // Enrique allowed use of event emitter to call virtual-player from turn service without circular dependencies
    ) {}

    startNextTurn(session: ActiveSession, server: Server): void {
        if (!session.room.isActive || session.timer.interval) return;

        this.resetPreviousPlayer(session);
        const playerTurn = this.prepareNextPlayer(session);

        session.turnActive = true;
        this.infoService.nextTurnLog(session, playerTurn);
        server.to(session.room.code).emit(GameLogicEvents.TurnStarted, playerTurn);

        if (playerTurn.isVirtual) {
            this.eventEmitter.emit(GameLogicEvents.VirtualPlayerTurn, session, server, playerTurn);
        } else {
            this.getReachableTiles(session, playerTurn);
            session.timer.count = CONSTANTS.ROUND_SECONDS_LENGTH;
            this.timerService.startTimer(session.timer, this.getTurnCounterSecond(session, server), this.getTurnCounterExpire(session, server));
        }
    }

    getNextTurnIndex(session: ActiveSession): number {
        if (session.turnIndex >= session.room.players.length - 1) {
            return 0;
        } else {
            return session.turnIndex + 1;
        }
    }

    hasTurn(session: ActiveSession, socketId: string): boolean {
        const playerIndex = session.room.players.findIndex((player: Player) => player.socketId === socketId);
        return playerIndex !== undefined && playerIndex === session.turnIndex;
    }

    continueTurn(session: ActiveSession, server: Server) {
        const player = session.room.players[session.turnIndex];
        if (session.timer.count > 0 && session.room.map && player) {
            this.timerService.startTimer(session.timer, this.getTurnCounterSecond(session, server), this.getTurnCounterExpire(session, server));
            server.to(player.socketId).emit(GameLogicEvents.AvailableTiles, this.tileValidityService.getReachableTiles(session.room.map, player));
            server.to(session.room.code).emit(GameLogicEvents.ContinueTurn);
        } else {
            this.endTurn(session, server);
        }
    }

    endTurn(session: ActiveSession, server: Server): void {
        if (!session.combat && session.turnActive) {
            session.turnActive = false;
            this.timerService.stopTimer(session.timer);
            server.to(session.room.code).emit(GameLogicEvents.Clock, 0);
            server.to(session.room.code).emit(GameLogicEvents.TurnEnded, session.room.players[this.getNextTurnIndex(session)]);
            setTimeout(() => {
                this.startNextTurn(session, server);
            }, CONSTANTS.END_TURN_DELAY);
        }
    }

    pauseTurn(session: ActiveSession): void {
        this.timerService.stopTimer(session.timer);
    }

    stopGame(session: ActiveSession, server: Server, winner?: Player): void {
        this.infoService.handleGameEnd(session, winner);
        this.timerService.stopTimer(session.timer);
        session.room.isActive = false;
        if (winner) server.to(session.room.code).emit(GameLogicEvents.GameOver, winner);
        else {
            server.to(session.room.code).emit(GameLogicEvents.GameAborted);
            this.activeSessionService.endSession(session);
        }
    }

    handlePlayerExit(player: Player, session: ActiveSession, server: Server): void {
        if (this.hasTurn(session, player.socketId)) {
            session.turnIndex--;
            this.endTurn(session, server);
        }
        const numRealPlayers: number = session.room.players.reduce<number>((acc: number, currPlayer: Player) => {
            if (!currPlayer.isVirtual) acc++;
            return acc;
        }, 0);
        const numVirtualPlayers = session.room.players.length - numRealPlayers;
        if (session.room.isActive) {
            const virtualPlayersExist = numVirtualPlayers > 0;
            const onePlayerLeft = numRealPlayers <= 2 && !virtualPlayersExist;
            const justVirtualPlayersLeft = numRealPlayers <= 1 && virtualPlayersExist;
            if (onePlayerLeft || justVirtualPlayersLeft) {
                this.stopGame(session, server);
            }
        }
        if (player.isHost) {
            session.debugMode = false;
            server.to(session.room.code).emit(GameLogicEvents.ToggleDebugMode, session.debugMode);
        }
        this.infoService.playerLeftLog(session, player);
        this.removePlayer(player, session);
    }

    finalizeGame(session: ActiveSession): void {
        this.activeSessionService.endSession(session);
    }

    private removePlayer(player: Player, session: ActiveSession) {
        const map = session.room.map;
        if (map) {
            map._tiles[player.position.y][player.position.x].player = undefined;
            session.server.to(session.room.code).emit(GameLogicEvents.UpdateMap, map);
        }
    }

    private getReachableTiles(session: ActiveSession, playerTurn: Player) {
        const reachableTiles = this.tileValidityService.getReachableTiles(session.room.map, session.room.players[session.turnIndex]);
        session.server.to(playerTurn.socketId).emit('availableTiles', reachableTiles);
    }

    private resetPreviousPlayer(session: ActiveSession) {
        if (session.turnIndex >= 0 && session.room.players[session.turnIndex]) {
            session.room.players[session.turnIndex].hasActed = false;
        }
    }

    private prepareNextPlayer(session: ActiveSession): Player {
        session.turnIndex = this.getNextTurnIndex(session);
        const playerTurn = session.room.players[session.turnIndex];
        playerTurn.attributes.currentSpeed = playerTurn.attributes.speedPoints;
        return playerTurn;
    }

    private getTurnCounterExpire(session: ActiveSession, server: Server): () => void {
        return () => this.endTurn(session, server);
    }

    private getTurnCounterSecond(session: ActiveSession, server: Server): (arg0: number) => void {
        return (count: number) => server.to(session.room.code).emit(GameLogicEvents.Clock, count);
    }
}
