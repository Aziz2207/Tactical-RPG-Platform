import { GameInfoService } from './game-info.service';
import { Server } from 'socket.io';
import { LogMessage } from '@common/interfaces/log-message';
import { ActiveSession } from '@app/interfaces/active-session';
import { Player } from '@common/interfaces/player';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { GlobalStats } from '@common/interfaces/global-stats';
import { PlayerStats } from '@common/interfaces/player-stats';

describe('GameInfoService', () => {
    let service: GameInfoService;
    let server: Server;
    let session: ActiveSession;
    let player: Player;
    let winner: Player;
    const CONSTANTS = {
        MS_TO_SECONDS_CONVERSION: 1000,
        PERCENTAGE: 100,
    };

    beforeEach(() => {
        service = new GameInfoService();

        // Mock server
        server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as Server;

        // Mock player
        player = {
            socketId: 'player-socket-id',
            userName: 'TestPlayer',
        } as Player;

        // Mock winner
        winner = {
            socketId: 'winner-socket-id',
            userName: 'WinnerPlayer',
        } as Player;

        // Mock session
        session = {
            server,
            room: {
                code: 'test-room',
                players: [player, winner],
            },
            startTime: new Date(),
            debugMode: false,
        } as ActiveSession;
    });

    describe('createLog', () => {
        it('should create a log message and add it to the logs map when logs for room do not exist', () => {
            const content = 'Test log message';
            const playersInvolved = ['player1', 'player2'];
            const roomId = 'room1';

            const log = service.createLog(content, playersInvolved, roomId);

            expect(log.content).toBe(content);
            expect(log.playersInvolved).toBe(playersInvolved);
            expect(log.time).toBeDefined();

            const logs = service.getLogs(roomId);
            expect(logs.length).toBe(1);
            expect(logs[0]).toBe(log);
        });

        it('should add log message to existing logs for the room', () => {
            const content1 = 'First log message';
            const content2 = 'Second log message';
            const playersInvolved = ['player1', 'player2'];
            const roomId = 'room1';

            service.createLog(content1, playersInvolved, roomId);
            service.createLog(content2, playersInvolved, roomId);

            const logs = service.getLogs(roomId);
            expect(logs.length).toBe(2);
            expect(logs[0].content).toBe(content1);
            expect(logs[1].content).toBe(content2);
        });
    });

    describe('gameEndedLog', () => {
        it('should create and send a log message when game ends without a winner', () => {
            jest.spyOn(service, 'createLog');
            jest.spyOn(service, 'sendToAllPlayers');

            service.gameEndedLog(session);

            expect(service.createLog).toHaveBeenCalledWith(
                'La partie est terminée. ',
                [player.socketId, winner.socketId],
                session.room.code,
            );
            expect(service.sendToAllPlayers).toHaveBeenCalled();
        });

        it('should create and send a log message when game ends with a winner', () => {
            jest.spyOn(service, 'createLog');
            jest.spyOn(service, 'sendToAllPlayers');

            service.gameEndedLog(session, winner);

            expect(service.createLog).toHaveBeenCalledWith(
                `La partie est terminée. ${winner.userName}a gagne`,
                [player.socketId, winner.socketId],
                session.room.code,
            );
            expect(service.sendToAllPlayers).toHaveBeenCalled();
        });
    });

    describe('sendToAllPlayers', () => {
        it('should emit GameLog event to all players in the room', () => {
            const message = {
                time: '12:00:00',
                content: 'Test message',
                playersInvolved: [player.socketId],
            } as LogMessage;
            const roomId = 'test-room';

            service.sendToAllPlayers(server, message, roomId);

            expect(server.to).toHaveBeenCalledWith(roomId);
            expect(server.emit).toHaveBeenCalledWith(GameLogicEvents.GameLog, message);
        });
    });

    describe('sendToCertainPlayers', () => {
        it('should emit GameLog event to certain players', () => {
            const message = {
                time: '12:00:00',
                content: 'Test message',
                playersInvolved: [player.socketId],
            } as LogMessage;
            const playersIds = [player.socketId, winner.socketId];

            service.sendToCertainPlayers(server, message, playersIds);

            expect(server.to).toHaveBeenCalledTimes(playersIds.length);
            expect(server.emit).toHaveBeenCalledTimes(playersIds.length);

            playersIds.forEach((playerId) => {
                expect(server.to).toHaveBeenCalledWith(playerId);
            });
        });
    });

    describe('getLogs', () => {
        it('should return empty array if no logs exist for the room', () => {
            const roomId = 'room1';
            const logs = service.getLogs(roomId);
            expect(logs).toEqual([]);
        });

        it('should return logs for the room if they exist', () => {
            const roomId = 'room1';
            const content = 'Test log message';
            const playersInvolved = ['player1', 'player2'];

            service.createLog(content, playersInvolved, roomId);

            const logs = service.getLogs(roomId);
            expect(logs.length).toBe(1);
            expect(logs[0].content).toBe(content);
        });
    });

    describe('createCombatTurnLog', () => {
        it('should create and send logs to attacker and defender', () => {
            const attacker = {
                socketId: 'attacker-socket-id',
                userName: 'Attacker',
            } as Player;
            const defender = {
                socketId: 'defender-socket-id',
                userName: 'Defender',
            } as Player;
            const roomCode = 'room1';

            jest.spyOn(service, 'createLog');
            jest.spyOn(service, 'sendToCertainPlayers');

            service.createCombatTurnLog(attacker, defender, roomCode, server);

            expect(service.createLog).toHaveBeenCalledTimes(2);
            expect(service.sendToCertainPlayers).toHaveBeenCalledTimes(2);
        });
    });

    describe('beginCombatLog', () => {
        it('should create and send a log message when combat begins', () => {
            const initiater = {
                socketId: 'initiater-socket-id',
                userName: 'Initiater',
            } as Player;
            const victim = {
                socketId: 'victim-socket-id',
                userName: 'Victim',
            } as Player;
            const roomCode = 'room1';

            jest.spyOn(service, 'createLog');
            jest.spyOn(service, 'sendToAllPlayers');

            service.beginCombatLog(initiater, victim, roomCode, server);

            expect(service.createLog).toHaveBeenCalled();
            expect(service.sendToAllPlayers).toHaveBeenCalled();
        });
    });

    describe('doorLog', () => {
        it('should create and send a log when door is opened', () => {
            const didOpen = true;
            const code = 'room1';

            jest.spyOn(service, 'createLog');
            jest.spyOn(service, 'sendToAllPlayers');

            service.doorLog(didOpen, player, code, server);

            expect(service.createLog).toHaveBeenCalled();
            expect(service.sendToAllPlayers).toHaveBeenCalled();
        });

        it('should create and send a log when door is closed', () => {
            const didOpen = false;
            const code = 'room1';

            jest.spyOn(service, 'createLog');
            jest.spyOn(service, 'sendToAllPlayers');

            service.doorLog(didOpen, player, code, server);

            expect(service.createLog).toHaveBeenCalled();
            expect(service.sendToAllPlayers).toHaveBeenCalled();
        });
    });

    describe('initialisePlayerStats', () => {
        it('should initialize playerStats and globalStats for the room', () => {
            const roomId = 'room1';
            const players = [player, winner];

            service.initialisePlayerStats(roomId, players);

            const playerStatsMap = service['playerStats'].get(roomId);
            expect(playerStatsMap.size).toBe(players.length);

            players.forEach((p) => {
                const stats = playerStatsMap.get(p.socketId);
                expect(stats).toBeDefined();
                expect(stats.username).toBe(p.userName);
            });

            const globalStats = service['globalStats'].get(roomId);
            expect(globalStats).toBeDefined();
            expect(globalStats.totalTurns).toBe(0);
        });
    });

    describe('resetStats', () => {
        it('should delete playerStats and globalStats for the room', () => {
            const roomId = 'room1';
            service['playerStats'].set(roomId, new Map());
            service['globalStats'].set(roomId, {} as GlobalStats);

            service.resetStats(roomId);

            expect(service['playerStats'].has(roomId)).toBe(false);
            expect(service['globalStats'].has(roomId)).toBe(false);
        });
    });

    describe('incrementTotalTurns', () => {
        it('should increment totalTurns in globalStats', () => {
            const roomId = 'room1';
            service['globalStats'].set(roomId, { totalTurns: 0 } as GlobalStats);

            service.incrementTotalTurns(roomId);

            const globalStats = service['globalStats'].get(roomId);
            expect(globalStats.totalTurns).toBe(1);
        });

        it('should not throw error when globalStats do not exist', () => {
            const roomId = 'room1';

            expect(() => service.incrementTotalTurns(roomId)).not.toThrow();
        });
    });

    describe('addVisitedTile', () => {
        it('should add tileKey to playerStats and globalStats when stats exist', () => {
            const roomId = 'room1';
            const playerId = player.socketId;
            const tileKey = 'tile1';

            service['playerStats'].set(roomId, new Map());
            service['playerStats'].get(roomId).set(playerId, { tilesVisited: new Set() } as PlayerStats);
            service['globalStats'].set(roomId, { tilesVisited: new Set() } as GlobalStats);

            service.addVisitedTile(roomId, playerId, tileKey);

            const playerStats = service['playerStats'].get(roomId).get(playerId);
            expect(playerStats.tilesVisited.has(tileKey)).toBe(true);

            const globalStats = service['globalStats'].get(roomId);
            expect(globalStats.tilesVisited.has(tileKey)).toBe(true);
        });

        it('should not throw error when stats do not exist', () => {
            const roomId = 'room1';
            const playerId = player.socketId;
            const tileKey = 'tile1';

            expect(() => service.addVisitedTile(roomId, playerId, tileKey)).not.toThrow();
        });
    });

    describe('addToggledDoor', () => {
        it('should add doorKey to doorsToggled in globalStats', () => {
            const roomId = 'room1';
            const doorKey = 'door1';

            service['globalStats'].set(roomId, { doorsToggled: new Set() } as GlobalStats);

            service.addToggledDoor(roomId, doorKey);

            const globalStats = service['globalStats'].get(roomId);
            expect(globalStats.doorsToggled.has(doorKey)).toBe(true);
        });

        it('should not throw error when globalStats do not exist', () => {
            const roomId = 'room1';
            const doorKey = 'door1';

            expect(() => service.addToggledDoor(roomId, doorKey)).not.toThrow();
        });
    });

    describe('addFlagHolder', () => {
        it('should add playerId to flagHolders in globalStats', () => {
            const roomId = 'room1';
            const playerId = player.socketId;

            service['globalStats'].set(roomId, { flagHolders: new Set() } as GlobalStats);

            service.addFlagHolder(roomId, playerId);

            const globalStats = service['globalStats'].get(roomId);
            expect(globalStats.flagHolders.has(playerId)).toBe(true);
        });

        it('should not throw error when globalStats do not exist', () => {
            const roomId = 'room1';
            const playerId = player.socketId;

            expect(() => service.addFlagHolder(roomId, playerId)).not.toThrow();
        });
    });

    describe('calculateFlagHoldersCount', () => {
        it('should calculate totalFlagHoldersCount in globalStats', () => {
            const roomId = 'room1';

            service['globalStats'].set(roomId, {
                flagHolders: new Set(['player1', 'player2']),
            } as GlobalStats);

            service.calculateFlagHoldersCount(roomId);

            const globalStats = service['globalStats'].get(roomId);
            expect(globalStats.totalFlagHoldersCount).toBe(2);
        });

        it('should not throw error when globalStats do not exist', () => {
            const roomId = 'room1';

            expect(() => service.calculateFlagHoldersCount(roomId)).not.toThrow();
        });
    });

    describe('setGameDuration', () => {

        it('should initialize globalStats if not present', () => {
            const startTime = new Date();
            session.startTime = startTime;

            const endTime = new Date(startTime.getTime() + 5000);
            jest.spyOn(global, 'Date').mockImplementation(() => endTime as unknown as Date);

            service.setGameDuration(session);

            const globalStats = service['globalStats'].get(session.room.code);
            expect(globalStats).toBeDefined();
            expect(globalStats.gameDuration).toBe(5);
        });
    });

    describe('incrementCombats', () => {
        it('should increment combats in playerStats', () => {
            const roomId = 'room1';
            const playerId = player.socketId;

            service['playerStats'].set(roomId, new Map());
            service['playerStats'].get(roomId).set(playerId, { combats: 0 } as PlayerStats);

            service.incrementCombats(roomId, playerId);

            const playerStats = service['playerStats'].get(roomId).get(playerId);
            expect(playerStats.combats).toBe(1);
        });
    });

    describe('incrementEscapes', () => {
        it('should increment escapes in playerStats', () => {
            const roomId = 'room1';
            const playerId = player.socketId;

            service['playerStats'].set(roomId, new Map());
            service['playerStats'].get(roomId).set(playerId, { escapes: 0 } as PlayerStats);

            service.incrementEscapes(roomId, playerId);

            const playerStats = service['playerStats'].get(roomId).get(playerId);
            expect(playerStats.escapes).toBe(1);
        });
    });

    describe('incrementVictories', () => {
        it('should increment victories in playerStats', () => {
            const roomId = 'room1';
            const playerId = player.socketId;

            service['playerStats'].set(roomId, new Map());
            service['playerStats'].get(roomId).set(playerId, { victories: 0 } as PlayerStats);

            service.incrementVictories(roomId, playerId);

            const playerStats = service['playerStats'].get(roomId).get(playerId);
            expect(playerStats.victories).toBe(1);
        });
    });

    describe('incrementDefeats', () => {
        it('should increment defeats in playerStats', () => {
            const roomId = 'room1';
            const playerId = player.socketId;

            service['playerStats'].set(roomId, new Map());
            service['playerStats'].get(roomId).set(playerId, { defeats: 0 } as PlayerStats);

            service.incrementDefeats(roomId, playerId);

            const playerStats = service['playerStats'].get(roomId).get(playerId);
            expect(playerStats.defeats).toBe(1);
        });
    });

    describe('incrementHealthLost', () => {
        it('should increment healthLost in playerStats', () => {
            const roomId = 'room1';
            const playerId = player.socketId;
            const healthLost = 10;

            service['playerStats'].set(roomId, new Map());
            service['playerStats'].get(roomId).set(playerId, { healthLost: 0 } as PlayerStats);

            service.incrementHealthLost(roomId, playerId, healthLost);

            const playerStats = service['playerStats'].get(roomId).get(playerId);
            expect(playerStats.healthLost).toBe(10);
        });
    });

    describe('incrementHealthInflicted', () => {
        it('should increment healthInflicted in playerStats', () => {
            const roomId = 'room1';
            const playerId = player.socketId;
            const healthInflicted = 15;

            service['playerStats'].set(roomId, new Map());
            service['playerStats'].get(roomId).set(playerId, { healthInflicted: 0 } as PlayerStats);

            service.incrementHealthInflicted(roomId, playerId, healthInflicted);

            const playerStats = service['playerStats'].get(roomId).get(playerId);
            expect(playerStats.healthInflicted).toBe(15);
        });
    });

    describe('incrementItemsCollected', () => {
        it('should increment itemsCollected in playerStats', () => {
            const roomId = 'room1';
            const playerId = player.socketId;

            service['playerStats'].set(roomId, new Map());
            service['playerStats'].get(roomId).set(playerId, { itemsCollected: 0 } as PlayerStats);

            service.incrementItemsCollected(roomId, playerId);

            const playerStats = service['playerStats'].get(roomId).get(playerId);
            expect(playerStats.itemsCollected).toBe(1);
        });
    });

    describe('calculateGlobalTiles', () => {
        it('should calculate percentageTilesVisited in globalStats when totalTiles > 0', () => {
            const roomId = 'room1';
            const totalTiles = 10;

            service['globalStats'].set(roomId, { tilesVisited: new Set(['tile1', 'tile2']) } as GlobalStats);

            service.calculateGlobalTiles(roomId, totalTiles);

            const globalStats = service['globalStats'].get(roomId);
            expect(globalStats.percentageTilesVisited).toBe(20);
        });

        it('should set percentageTilesVisited to 0 when totalTiles <= 0', () => {
            const roomId = 'room1';
            const totalTiles = 0;

            service['globalStats'].set(roomId, { tilesVisited: new Set(['tile1', 'tile2']) } as GlobalStats);

            service.calculateGlobalTiles(roomId, totalTiles);

            const globalStats = service['globalStats'].get(roomId);
            expect(globalStats.percentageTilesVisited).toBe(0);
        });
    });

    describe('calculatePlayerTiles', () => {
        it('should calculate percentageTilesVisited for each player when totalTiles > 0', () => {
            const roomId = 'room1';
            const totalTiles = 10;

            const playerStatsMap = new Map<string, PlayerStats>();
            playerStatsMap.set(player.socketId, { tilesVisited: new Set(['tile1', 'tile2']) } as PlayerStats);
            service['playerStats'].set(roomId, playerStatsMap);

            service.calculatePlayerTiles(roomId, totalTiles);

            const playerStats = service['playerStats'].get(roomId).get(player.socketId);
            expect(playerStats.percentageTilesVisited).toBe(20);
        });

        it('should set percentageTilesVisited to 0 when totalTiles <= 0', () => {
            const roomId = 'room1';
            const totalTiles = 0;

            const playerStatsMap = new Map<string, PlayerStats>();
            playerStatsMap.set(player.socketId, { tilesVisited: new Set(['tile1', 'tile2']) } as PlayerStats);
            service['playerStats'].set(roomId, playerStatsMap);

            service.calculatePlayerTiles(roomId, totalTiles);

            const playerStats = service['playerStats'].get(roomId).get(player.socketId);
            expect(playerStats.percentageTilesVisited).toBe(0);
        });
    });

    describe('calculateDoorsToggled', () => {
        it('should calculate percentageDoorsToggled in globalStats when totalDoors > 0', () => {
            const roomId = 'room1';
            const totalDoors = 5;

            service['globalStats'].set(roomId, { doorsToggled: new Set(['door1', 'door2']) } as GlobalStats);

            service.calculateDoorsToggled(roomId, totalDoors);

            const globalStats = service['globalStats'].get(roomId);
            expect(globalStats.percentageDoorsToggled).toBe(40);
        });

        it('should set percentageDoorsToggled to 0 when totalDoors <= 0', () => {
            const roomId = 'room1';
            const totalDoors = 0;

            service['globalStats'].set(roomId, { doorsToggled: new Set(['door1', 'door2']) } as GlobalStats);

            service.calculateDoorsToggled(roomId, totalDoors);

            const globalStats = service['globalStats'].get(roomId);
            expect(globalStats.percentageDoorsToggled).toBe(0);
        });
    });

    describe('getAllStats', () => {
        it('should return all stats for the room', () => {
            const roomId = 'room1';

            const playerStatsMap = new Map<string, PlayerStats>();
            playerStatsMap.set(player.socketId, { username: player.userName } as PlayerStats);
            service['playerStats'].set(roomId, playerStatsMap);

            const globalStats = { totalTurns: 5 } as GlobalStats;
            service['globalStats'].set(roomId, globalStats);

            const stats = service.getAllStats(roomId);

            expect(stats.playerStats.length).toBe(1);
            expect(stats.playerStats[0].username).toBe(player.userName);
            expect(stats.globalStats).toBe(globalStats);
        });
    });

    describe('handleGameEnd', () => {
        it('should handle game end and reset stats', () => {
            jest.spyOn(service, 'setGameDuration');
            jest.spyOn(service, 'gameEndedLog');
            jest.spyOn(service, 'resetStats');

            service.handleGameEnd(session, winner);

            expect(service.setGameDuration).toHaveBeenCalled();
            expect(service.gameEndedLog).toHaveBeenCalledWith(session, winner);
            expect(service.resetStats).toHaveBeenCalledWith(session.room.code);
        });
    });

    describe('playerLeftLog', () => {
        it('should create and send a log message when player leaves', () => {
            jest.spyOn(service, 'createLog');
            jest.spyOn(service, 'sendToAllPlayers');

            service.playerLeftLog(session, player);

            expect(service.createLog).toHaveBeenCalled();
            expect(service.sendToAllPlayers).toHaveBeenCalled();
        });
    });

    describe('nextTurnLog', () => {
        it('should create and send a log message for next player turn', () => {
            jest.spyOn(service, 'createLog');
            jest.spyOn(service, 'sendToAllPlayers');
            jest.spyOn(service, 'incrementTotalTurns');

            service.nextTurnLog(session, player);

            expect(service.createLog).toHaveBeenCalled();
            expect(service.sendToAllPlayers).toHaveBeenCalled();
            expect(service.incrementTotalTurns).toHaveBeenCalledWith(session.room.code);
        });
    });
});
