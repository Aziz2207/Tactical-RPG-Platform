import { ActiveSession } from '@app/interfaces/active-session';
import { CONSTANTS } from '@common/constants';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { GlobalStats } from '@common/interfaces/global-stats';
import { LogMessage } from '@common/interfaces/log-message';
import { Player } from '@common/interfaces/player';
import { PlayerStats } from '@common/interfaces/player-stats';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class GameInfoService {
    private logs: Map<string, LogMessage[]> = new Map<string, LogMessage[]>();
    private playerStats: Map<string, Map<string, PlayerStats>> = new Map<string, Map<string, PlayerStats>>();
    private globalStats: Map<string, GlobalStats> = new Map<string, GlobalStats>();

    createLog(content: string, playersInvolved: string[], roomId: string): LogMessage {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const message: LogMessage = { time, content, playersInvolved };
        if (!this.logs.get(roomId)) {
            this.logs.set(roomId, []);
        }

        this.logs.get(roomId).push(message);
        return message;
    }

    gameEndedLog(session: ActiveSession, winner?: Player) {
        const logMessage = this.createLog(
            `La partie est terminée. ${winner ? winner.userName + 'a gagne' : ''}`,
            session.room.players.map((player) => player.socketId),
            session.room.code,
        );
        this.sendToAllPlayers(session.server, logMessage, session.room.code);
    }

    sendToAllPlayers(server: Server, message: LogMessage, roomId: string) {
        server.to(roomId).emit(GameLogicEvents.GameLog, message);
    }

    sendToCertainPlayers(server: Server, message: LogMessage, playersIds: string[]) {
        playersIds.forEach((playerId) => {
            server.to(playerId).emit(GameLogicEvents.GameLog, message);
        });
    }

    getLogs(roomId: string): LogMessage[] {
        return this.logs.get(roomId) || [];
    }

    createCombatTurnLog(attacker: Player, defender: Player, roomCode: string, server: Server) {
        const yourTurnLog = this.createLog("C'est à ton tour de jouer", [attacker.socketId], roomCode);
        const nextTurnLog = this.createLog(`C'est au tour de ${attacker.userName} de jouer`, [defender.socketId], roomCode);
        this.sendToCertainPlayers(server, yourTurnLog, [attacker.socketId]);
        this.sendToCertainPlayers(server, nextTurnLog, [defender.socketId]);
    }

    beginCombatLog(initiater: Player, victim: Player, roomCode: string, server: Server) {
        const logMessage = this.createLog(
            `${initiater.userName} a lancé un combat contre ${victim.userName}.`,
            [initiater.socketId, victim.socketId],
            roomCode,
        );
        this.sendToAllPlayers(server, logMessage, roomCode);
    }

    doorLog(didOpen: boolean, player: Player, code: string, server: Server) {
        const logMessage = this.createLog(`${player.userName} a ${didOpen ? 'ouvert' : 'fermé'} une porte.`, [player.socketId], code);
        this.sendToAllPlayers(server, logMessage, code);
    }

    initialisePlayerStats(roomId: string, players: Player[]): void {
        const roomPlayerStats = new Map<string, PlayerStats>();
        players.forEach((player) => {
            roomPlayerStats.set(player.socketId, {
                username: player.userName,
                combats: 0,
                escapes: 0,
                victories: 0,
                defeats: 0,
                healthLost: 0,
                healthInflicted: 0,
                itemsCollected: 0,
                tilesVisited: new Set<string>(),
            });
        });
        this.playerStats.set(roomId, roomPlayerStats);

        const roomGlobalStats: GlobalStats = {
            totalTurns: 0,
            tilesVisited: new Set<string>(),
            doorsToggled: new Set<string>(),
            gameDuration: 0,
            flagHolders: new Set<string>(),
        };
        this.globalStats.set(roomId, roomGlobalStats);
    }

    resetStats(roomId: string): void {
        this.playerStats.delete(roomId);
        this.globalStats.delete(roomId);
    }

    incrementTotalTurns(roomId: string): void {
        const roomGlobalStats = this.globalStats.get(roomId);
        if (roomGlobalStats) {
            roomGlobalStats.totalTurns++;
        }
    }

    addVisitedTile(roomId: string, playerId: string, tileKey: string): void {
        const roomPlayerStats = this.playerStats.get(roomId);
        const roomGlobalStats = this.globalStats.get(roomId);
        if (roomPlayerStats && roomGlobalStats) {
            const playerStats = roomPlayerStats.get(playerId);
            if (playerStats) {
                playerStats.tilesVisited.add(tileKey);
                roomGlobalStats.tilesVisited.add(tileKey);
            }
        }
    }

    addToggledDoor(roomId: string, doorKey: string): void {
        const roomGlobalStats = this.globalStats.get(roomId);
        if (roomGlobalStats) {
            roomGlobalStats.doorsToggled.add(doorKey);
        }
    }

    addFlagHolder(roomId: string, playerId: string): void {
        const roomGlobalStats = this.globalStats.get(roomId);
        if (roomGlobalStats) {
            roomGlobalStats.flagHolders.add(playerId);
        }
    }

    calculateFlagHoldersCount(roomId: string): void {
        const roomGlobalStats = this.globalStats.get(roomId);
        if (roomGlobalStats && roomGlobalStats.flagHolders) {
            roomGlobalStats.totalFlagHoldersCount = roomGlobalStats.flagHolders.size;
        } else if (roomGlobalStats) {
            roomGlobalStats.totalFlagHoldersCount = 0;
        }
    }

    setGameDuration(session: ActiveSession): void {
        const endTime = new Date();
        const duration = (endTime.getTime() - session.startTime.getTime()) / CONSTANTS.MS_TO_SECONDS_CONVERSION;
        let roomGlobalStats = this.globalStats.get(session.room.code);
        if (!roomGlobalStats) {
            roomGlobalStats = {
                totalTurns: 0,
                tilesVisited: new Set<string>(),
                doorsToggled: new Set<string>(),
                gameDuration: 0,
                flagHolders: new Set<string>(),
            };
            this.globalStats.set(session.room.code, roomGlobalStats);
        }
        roomGlobalStats.gameDuration = duration;
    }

    incrementCombats(roomId: string, playerId: string): void {
        const roomPlayerStats = this.playerStats.get(roomId);
        if (roomPlayerStats) {
            const playerStats = roomPlayerStats.get(playerId);
            if (playerStats) {
                playerStats.combats++;
            }
        }
    }

    incrementEscapes(roomId: string, playerId: string): void {
        const roomPlayerStats = this.playerStats.get(roomId);
        if (roomPlayerStats) {
            const playerStats = roomPlayerStats.get(playerId);
            if (playerStats) {
                playerStats.escapes++;
            }
        }
    }

    incrementVictories(roomId: string, playerId: string): void {
        const roomPlayerStats = this.playerStats.get(roomId);
        if (roomPlayerStats) {
            const playerStats = roomPlayerStats.get(playerId);
            if (playerStats) {
                playerStats.victories++;
            }
        }
    }

    incrementDefeats(roomId: string, playerId: string): void {
        const roomPlayerStats = this.playerStats.get(roomId);
        if (roomPlayerStats) {
            const playerStats = roomPlayerStats.get(playerId);
            if (playerStats) {
                playerStats.defeats++;
            }
        }
    }

    incrementHealthLost(roomId: string, playerId: string, healthLost: number): void {
        const roomPlayerStats = this.playerStats.get(roomId);
        if (roomPlayerStats) {
            const playerStats = roomPlayerStats.get(playerId);
            if (playerStats) {
                playerStats.healthLost += healthLost;
            }
        }
    }

    incrementHealthInflicted(roomId: string, playerId: string, healthInflicted: number): void {
        const roomPlayerStats = this.playerStats.get(roomId);
        if (roomPlayerStats) {
            const playerStats = roomPlayerStats.get(playerId);
            if (playerStats) {
                playerStats.healthInflicted += healthInflicted;
            }
        }
    }

    incrementItemsCollected(roomId: string, playerId: string): void {
        const roomPlayerStats = this.playerStats.get(roomId);
        if (roomPlayerStats) {
            const playerStats = roomPlayerStats.get(playerId);
            if (playerStats) {
                playerStats.itemsCollected++;
            }
        }
    }

    calculateGlobalTiles(roomId: string, totalTiles: number): void {
        const roomGlobalStats = this.globalStats.get(roomId);
        if (roomGlobalStats) {
            if (totalTiles > 0) {
                roomGlobalStats.percentageTilesVisited = parseFloat(
                    ((roomGlobalStats.tilesVisited.size / totalTiles) * CONSTANTS.PERCENTAGE).toFixed(2),
                );
            } else {
                roomGlobalStats.percentageTilesVisited = 0;
            }
        }
    }

    calculatePlayerTiles(roomId: string, totalTiles: number): void {
        const roomPlayerStats = this.playerStats.get(roomId);
        if (roomPlayerStats) {
            roomPlayerStats.forEach((stats) => {
                if (totalTiles > 0) {
                    stats.percentageTilesVisited = parseFloat(((stats.tilesVisited.size / totalTiles) * CONSTANTS.PERCENTAGE).toFixed(2));
                } else {
                    stats.percentageTilesVisited = 0;
                }
            });
        }
    }

    calculateDoorsToggled(roomId: string, totalDoors: number): void {
        const roomGlobalStats = this.globalStats.get(roomId);
        if (roomGlobalStats) {
            if (totalDoors > 0) {
                roomGlobalStats.percentageDoorsToggled = parseFloat(
                    ((roomGlobalStats.doorsToggled.size / totalDoors) * CONSTANTS.PERCENTAGE).toFixed(2),
                );
            } else {
                roomGlobalStats.percentageDoorsToggled = 0;
            }
        }
    }

    getAllStats(roomId: string): { playerStats: PlayerStats[]; globalStats: GlobalStats } {
        const roomPlayerStats = this.playerStats.get(roomId);
        const roomGlobalStats = this.globalStats.get(roomId);
        this.calculateFlagHoldersCount(roomId);

        return {
            playerStats: roomPlayerStats ? Array.from(roomPlayerStats.values()) : [],
            globalStats: roomGlobalStats || null,
        };
    }

    handleGameEnd(session: ActiveSession, winner?: Player) {
        this.setGameDuration(session);
        session.server.to(session.room.code).emit(GameLogicEvents.GameOverStats, this.getAllStats(session.room.code));
        this.gameEndedLog(session, winner);
        this.resetStats(session.room.code);
    }

    playerLeftLog(session: ActiveSession, player: Player) {
        const logMessage = this.createLog(
            `${player.userName} a quitté la partie. ${session.debugMode ? 'Le mode debug est désactivé.' : ''}`,
            [player.socketId],
            session.room.code,
        );
        this.sendToAllPlayers(session.server, logMessage, session.room.code);
    }

    nextTurnLog(session: ActiveSession, playerTurn: Player) {
        const logMessage = this.createLog(`Cest à ${playerTurn.userName} de jouer.`, [playerTurn.socketId], session.room.code);
        this.sendToAllPlayers(session.server, logMessage, session.room.code);
        this.incrementTotalTurns(session.room.code);
    }
}
