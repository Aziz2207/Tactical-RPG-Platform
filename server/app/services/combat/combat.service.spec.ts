import { Timer } from '@app/classes/timer/timer';
import {
    DEFAULT_ATTRIBUTE,
    END_COMBAT_DELAY,
    EVASION_SUCCESS_RATE,
    FIGHT_TIME,
    ICE_TILE_PENALTY_VALUE,
    MIN_DICE_VALUE,
    NO_EVASION_TIME,
    ROLL_DURATION,
    TURN_TIME,
    TWO_BOTS_FIGHT_TIME,
    XIPHOS_ATTACK_BONUS,
    XIPHOS_DEFENSE_PENALTY,
} from '@app/constants';
import { mockAttacker, mockCombatInfos, mockCombatPlayers, mockDefender } from '@app/mocks/mock-combat-infos';
import { mockGame } from '@app/mocks/mock-game';
import { mockPlayers } from '@app/mocks/mock-players';
import { mockRooms } from '@app/mocks/mock-room';
import { CombatService } from '@app/services/combat/combat.service';
import { GameLogsService } from '@app/services/game-logs/game-logs.service';
import { GameService } from '@app/services/game/game.service';
import { ObjectType } from '@common/avatars-info';
import { GameMode, TileType, XiphosEffect } from '@common/constants';
import { CombatInfos, CombatPlayers } from '@common/interfaces/combat-info';
import { Behavior, Player, Status } from '@common/interfaces/player';
import { PlayerStatType } from '@common/interfaces/post-game-stat';
import { Room } from '@common/interfaces/room';
import { ActionData } from '@common/interfaces/socket-data.interface';
import { ServerToClientEvent } from '@common/socket.events';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';

/* eslint-disable max-lines */
describe('CombatService', () => {
    let service: CombatService;
    let mockGameService: jest.Mocked<GameService>;
    let mockLogsService: jest.Mocked<GameLogsService>;
    let mockServer: Server;
    let mockClient: Socket;
    let room: Room;
    let combatPlayers: CombatPlayers;
    let combatInfos: CombatInfos;
    let attacker: Player;
    let defender: Player;

    beforeEach(async () => {
        mockGameService = {
            onTurnEnded: jest.fn(),
            stopGameTimers: jest.fn(),
            getActivePlayer: jest.fn(),
            placeItemsOnGround: jest.fn(),
            resetGlobalStats: jest.fn(),
            onEndGame: jest.fn(),
            getServer: jest.fn().mockReturnValue(mockServer),
            emitEventToRoom: jest.fn(),
            leavePlayerFromGame: jest.fn(),
            getTurnTimer: jest.fn().mockReturnValue({
                getTimeRemaining: jest.fn().mockReturnValue(TURN_TIME),
                pauseTimer: jest.fn(),
                resumeTimer: jest.fn(),
            }),
            getFightTimer: jest.fn().mockReturnValue({
                resetTimer: jest.fn(),
                stopTimer: jest.fn(),
                getTimeRemaining: jest.fn().mockReturnValue(FIGHT_TIME),
            }),
        } as unknown as jest.Mocked<GameService>;

        mockLogsService = {
            createLog: jest.fn(),
            getGameLog: jest.fn(),
            sendPlayerLog: jest.fn(),
            sendEndGameLog: jest.fn(),
            sendGlobalCombatLog: jest.fn(),
            sendCombatActionLog: jest.fn(),
            sendCombatResultLog: jest.fn(),
        } as unknown as jest.Mocked<GameLogsService>;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: {
                sockets: new Map(),
                adapter: {
                    rooms: new Map(),
                },
            },
        } as unknown as jest.Mocked<Server>;

        mockClient = { id: 'admin', data: { roomCode: '1234' }, to: jest.fn().mockReturnThis(), emit: jest.fn() } as unknown as Socket;
        room = JSON.parse(JSON.stringify(mockRooms[0]));
        combatPlayers = JSON.parse(JSON.stringify(mockCombatPlayers));
        combatInfos = JSON.parse(JSON.stringify(mockCombatInfos));
        attacker = JSON.parse(JSON.stringify(mockAttacker));
        defender = JSON.parse(JSON.stringify(mockDefender));

        const module: TestingModule = await Test.createTestingModule({
            providers: [CombatService, { provide: GameService, useValue: mockGameService }, { provide: GameLogsService, useValue: mockLogsService }],
        }).compile();

        service = module.get<CombatService>(CombatService);
        service.combatInfos.set(room.roomId, combatInfos);
        room.listPlayers = [mockPlayers[0]];
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('startFight', () => {
        it('should initialize players and emit startFight event', () => {
            const combatActionData: ActionData = { clickedPosition: { x: 0, y: 1 }, player: attacker };
            service['initializeCombatInfos'] = jest.fn().mockReturnValue(combatPlayers);
            mockLogsService.sendGlobalCombatLog = jest.fn();
            service['isAttacker'] = jest.fn().mockReturnValue(true);
            service['emitToCombatPlayers'] = jest.fn();
            service['onStartTurn'] = jest.fn();

            service.startFight(room, combatActionData);

            expect(mockLogsService.sendGlobalCombatLog).toHaveBeenCalled();
            expect(service['emitToCombatPlayers']).toHaveBeenCalled();
            expect(service['onStartTurn']).toHaveBeenCalledWith(room);
        });
    });

    describe('attackPlayer', () => {
        it('should decrease defensePlayer HP when attack is successful', () => {
            const combatValue = { attackValues: { total: 10, diceValue: 4 }, defenseValues: { total: 4, diceValue: 1 } };
            service['getCombatValues'] = jest.fn().mockReturnValue(combatValue);
            service['handleAttackSuccess'] = jest.fn();
            service['checkCombatOutcome'] = jest.fn();
            mockLogsService.sendCombatResultLog = jest.fn();

            service.attackPlayer(room);
            expect(service['checkCombatOutcome']).toHaveBeenCalled();
            expect(mockLogsService.sendCombatResultLog).toHaveBeenCalled();
            expect(service['handleAttackSuccess']).toHaveBeenCalled();
        });

        it('should call handleFailAttack', () => {
            const combatValue = { attackValues: { total: 5, diceValue: 4 }, defenseValues: { total: 10, diceValue: 1 } };
            service['getCombatValues'] = jest.fn().mockReturnValue(combatValue);
            service['handleFailAttack'] = jest.fn();
            service['checkCombatOutcome'] = jest.fn();
            mockLogsService.sendCombatResultLog = jest.fn();

            service.attackPlayer(room);
            expect(service['checkCombatOutcome']).toHaveBeenCalled();
            expect(mockLogsService.sendCombatResultLog).toHaveBeenCalled();
            expect(service['handleFailAttack']).toHaveBeenCalled();
        });
    });

    describe('manageCombatPlayerDisconnection', () => {
        it('should reset combat state when a player disconnects while in combat', () => {
            const player = { id: mockClient.id, isActive: true } as unknown as Player;
            room.listPlayers.push(player);
            mockServer.sockets.sockets.set(mockClient.id, mockClient);
            const sockets = new Set([mockClient.id, 'socket2', 'socket3']);
            mockServer.sockets.adapter.rooms.set(room.roomId, sockets);

            service['getOpponent'] = jest.fn().mockReturnValue(player);
            mockLogsService.sendPlayerLog = jest.fn();
            service['handleDefaultCombatWin'] = jest.fn();
            service['resetCombatState'] = jest.fn();
            service['hasValidActivePlayers'] = jest.fn().mockReturnValue(true);
            service['continuePlayerTurn'] = jest.fn();

            service['manageCombatPlayerDisconnection'](mockClient, room);
            expect(service['continuePlayerTurn']).toHaveBeenCalled();
        });

        it('should return if no player left to play with', () => {
            const player = { id: mockClient.id, isActive: true } as unknown as Player;
            service['getOpponent'] = jest.fn().mockReturnValue(player);
            service['resetCombatState'] = jest.fn();
            service['hasValidActivePlayers'] = jest.fn().mockReturnValue(false);
            service['handleDefaultCombatWin'] = jest.fn();

            service['manageCombatPlayerDisconnection'](mockClient, room);
            expect(service['handleDefaultCombatWin']).not.toHaveBeenCalled();
        });
    });

    it('should handle disconnection', () => {
        service['isInCombat'] = jest.fn().mockReturnValue(true);
        service['manageCombatPlayerDisconnection'] = jest.fn();

        service.handleDisconnectedPlayer(mockClient, room);
    });

    describe('isInCombat', () => {
        let players;
        beforeEach(() => {
            players = service.combatInfos.get(room.roomId).combatPlayers;
            mockClient.data.roomCode = room.roomId;
        });

        it('should return false if data is undefined', () => {
            mockClient.data = undefined;
            const result = service['isInCombat'](mockClient);
            expect(result).toBe(false);
        });

        it('should return false if no combat in room', () => {
            mockClient.data.roomCode = 'noCode';
            const result = service['isInCombat'](mockClient);
            expect(result).toBe(false);
        });

        it('should return false if attacker undefined', () => {
            players.defender = defender;
            players.attacker = undefined;
            const result = service['isInCombat'](mockClient);
            expect(result).toBe(false);
        });

        it('should return false if defender undefined', () => {
            players.attacker = attacker;
            players.defender = undefined;
            const result = service['isInCombat'](mockClient);
            expect(result).toBe(false);
        });

        it('should return true if player is the attacker in combat', () => {
            players.attacker = attacker;
            players.defender = defender;
            players.attacker.id = mockClient.id;
            const result = service['isInCombat'](mockClient);
            expect(result).toBe(true);
        });

        it('should return true if player is the defender in combat', () => {
            players.attacker = attacker;
            players.defender = defender;
            players.defender.id = mockClient.id;
            const result = service['isInCombat'](mockClient);
            expect(result).toBe(true);
        });
    });

    describe('emitToCombatPlayers', () => {
        it('should emit the event to both activePlayer and defensePlayer', () => {
            const event = 'testEvent';
            const data = { key: 'value' };
            service['getServer'] = jest.fn().mockReturnValue(mockServer);

            service['emitToCombatPlayers'](combatPlayers, event, data);

            expect(mockServer.to).toHaveBeenCalledWith(combatPlayers.attacker.id);
            expect(mockServer.to).toHaveBeenCalledWith(combatPlayers.defender.id);
            expect(mockServer.to(combatPlayers.attacker.id).emit).toHaveBeenCalledWith(event, data);
            expect(mockServer.to(combatPlayers.defender.id).emit).toHaveBeenCalledWith(event, data);
        });
    });

    describe('setFightTimer', () => {
        it('should reset timer and emit to players setFightTimer', () => {
            service['canBotAttack'] = jest.fn().mockReturnValue(false);
            const remainingTime = 2;
            const fightTimerCallback = jest.fn();
            const resetTimerMock = jest.fn((time, callback) => {
                fightTimerCallback.mockImplementation(callback);
            });
            const fightTimer = {
                resetTimer: resetTimerMock,
            } as unknown as Timer;
            jest.spyOn(mockGameService, 'getFightTimer').mockReturnValue(fightTimer);
            service['emitToCombatPlayers'] = jest.fn();
            service.attackPlayer = jest.fn();
            room.listPlayers.push(mockPlayers[0]);

            service['setFightTimer'](room, combatPlayers);
            fightTimerCallback(remainingTime);
            expect(service['emitToCombatPlayers']).toHaveBeenCalled();
            fightTimerCallback(0);
        });

        it('should reset timer to 3 seconds and emit to players setFightTimer', () => {
            const player = service.combatInfos.get(room.roomId).combatPlayers.attacker;
            player.attributes.evasion = 0;
            const remainingTime = 2;
            const fightTimerCallback = jest.fn();
            const resetTimerMock = jest.fn((time, callback) => {
                fightTimerCallback.mockImplementation(callback);
            });
            const fightTimer = {
                resetTimer: resetTimerMock,
            } as unknown as Timer;
            jest.spyOn(mockGameService, 'getFightTimer').mockReturnValue(fightTimer);
            service['emitToCombatPlayers'] = jest.fn();
            service.attackPlayer = jest.fn();
            room.listPlayers.push(mockPlayers[0]);

            service['setFightTimer'](room, combatPlayers);
            fightTimerCallback(remainingTime);
            service['canBotAttack'] = jest.fn().mockReturnValue(true);

            expect(service['emitToCombatPlayers']).toHaveBeenCalled();
            fightTimerCallback(0);
        });
    });

    it('should switch attacker onEndTurn', () => {
        service['emitToCombatPlayers'] = jest.fn();
        service['onStartTurn'] = jest.fn();

        service['onEndTurn'](room);

        expect(service.combatInfos.get(room.roomId)).toBe(combatInfos);
        expect(service['emitToCombatPlayers']).toHaveBeenCalled();
        expect(service['onStartTurn']).toHaveBeenCalledWith(room);
    });

    describe('onStartTurn', () => {
        it('should checkXiphos and set timer', () => {
            service['isDefensiveBotDamaged'] = jest.fn().mockReturnValue(false);
            service['checkXiphos'] = jest.fn();
            service['setFightTimer'] = jest.fn();

            service['onStartTurn'](room);

            expect(service['checkXiphos']).toHaveBeenCalled();
            expect(service['setFightTimer']).toHaveBeenCalled();
        });

        it('should try evading player and if defensive bot is damaged', () => {
            service['isDefensiveBotDamaged'] = jest.fn().mockReturnValue(true);
            service['evadingPlayer'] = jest.fn();
            service['setFightTimer'] = jest.fn();

            service['onStartTurn'](room);

            expect(service['evadingPlayer']).toHaveBeenCalled();
            expect(service['setFightTimer']).not.toHaveBeenCalled();
        });
    });

    describe('evadingPlayer', () => {
        it('should continue turn if evasion is successful', () => {
            service['isEvasionSuccessful'] = jest.fn().mockReturnValue(true);
            service['handleEvasionSuccess'] = jest.fn();
            service.evadingPlayer(room);
            expect(service['handleEvasionSuccess']).toHaveBeenCalledWith(room);
        });

        it('should end turn if evasion is not successful', () => {
            service['emitToCombatPlayers'] = jest.fn();
            service['onEndTurn'] = jest.fn();
            service['isEvasionSuccessful'] = jest.fn().mockReturnValue(false);

            service.evadingPlayer(room);

            expect(mockLogsService.sendCombatActionLog).toHaveBeenCalled();
            expect(service['emitToCombatPlayers']).toHaveBeenCalled();
            expect(service['onEndTurn']).toHaveBeenCalledWith(room);
        });
    });

    describe('initializeCombatInfos', () => {
        it('should initialize players and emit startFight event', () => {
            const combatActionData: ActionData = { clickedPosition: { x: 0, y: 1 }, player: attacker };
            room.navigation.getCombatOpponent = jest.fn().mockReturnValue(defender);
            service['handlePlayerOnIce'] = jest.fn();

            service['initializeCombatInfos'](combatActionData, room);

            expect(service['handlePlayerOnIce']).toHaveBeenCalled();
        });

        it('should return if no opponent', () => {
            const combatActionData: ActionData = { clickedPosition: { x: 0, y: 1 }, player: attacker };
            room.navigation.getCombatOpponent = jest.fn().mockReturnValue(undefined);
            service['handlePlayerOnIce'] = jest.fn();

            service['initializeCombatInfos'](combatActionData, room);

            expect(service['handlePlayerOnIce']).not.toHaveBeenCalled();
        });
    });

    it('should decrease activePlayer HP when attack is successful', () => {
        service['addToPostGameStats'] = jest.fn();
        service['emitToCombatPlayers'] = jest.fn();

        service['handleAttackSuccess'](combatPlayers, room);
        expect(service['addToPostGameStats']).toHaveBeenCalled();
        expect(service['emitToCombatPlayers']).toHaveBeenCalled();
        expect(mockLogsService.sendCombatActionLog).toHaveBeenCalled();
    });

    it('should handleFailAttack', () => {
        service['checkAchillesArmor'] = jest.fn().mockReturnValue(true);
        service['emitToCombatPlayers'] = jest.fn();

        service['handleFailAttack'](combatPlayers, room);
        expect(service['checkAchillesArmor']).toHaveBeenCalled();
        expect(service['emitToCombatPlayers']).toHaveBeenCalled();
        expect(mockLogsService.sendCombatActionLog).toHaveBeenCalled();
    });

    it('should end game turn if winner is a bot', () => {
        service['isPlayerBot'] = jest.fn().mockReturnValue(true);
        service['handleWinnerTurn'](mockAttacker, room);
        expect(mockGameService.onTurnEnded).toHaveBeenCalled();
    });

    describe('getCombatValues', () => {
        it('should set attack to max dice value and defense to min dice value on debug mode', () => {
            const players = service.combatInfos.get(room.roomId).combatPlayers;
            const attackDice = players.attacker.attributes.atkDiceMax;
            const expectedAttackValues = { total: players.attacker.attributes.attack + attackDice, diceValue: attackDice };
            const expectedDefenseValues = { total: players.defender.attributes.defense + MIN_DICE_VALUE, diceValue: MIN_DICE_VALUE };
            const expectedResult = { attackValues: expectedAttackValues, defenseValues: expectedDefenseValues };

            const result = service['getCombatValues'](players, true);
            expect(result).toEqual(expectedResult);
            expect(players.combatResultDetails).toEqual(expectedResult);
        });

        it('should calculate dice value and set result in combatPlayers not in debug mode', () => {
            const attackDice = 2;
            const defenseDice = 5;
            const players = service.combatInfos.get(room.roomId).combatPlayers;
            const expectedAttackValues = { total: players.attacker.attributes.attack + attackDice, diceValue: attackDice };
            const expectedDefenseValues = { total: players.defender.attributes.defense + defenseDice, diceValue: defenseDice };
            const expectedResult = { attackValues: expectedAttackValues, defenseValues: expectedDefenseValues };
            service['getRandomValue'] = jest.fn().mockReturnValueOnce(attackDice).mockReturnValue(defenseDice);

            const result = service['getCombatValues'](players, false);
            expect(result).toEqual(expectedResult);
            expect(players.combatResultDetails).toEqual(expectedResult);
        });
    });

    describe('managePlayerDeath', () => {
        it('should manage player death', () => {
            service['replacePlayerOnSpawnPoint'] = jest.fn();
            service['handleTurnAfterCombat'] = jest.fn();
            service['handleCombatWon'] = jest.fn();
            service['resetPlayerIcePenalty'] = jest.fn();
            service['emitToCombatPlayers'] = jest.fn();

            service['managePlayerDeath'](room, attacker, defender);

            expect(service['replacePlayerOnSpawnPoint']).toHaveBeenCalledWith(defender, room);
            expect(service['handleTurnAfterCombat']).toHaveBeenCalledWith(attacker, room);
            expect(service['handleCombatWon']).toHaveBeenCalledWith(attacker, room);
            expect(service['resetPlayerIcePenalty']).toHaveBeenCalled();
            expect(service['emitToCombatPlayers']).toHaveBeenCalled();
        });
    });

    describe('checkCombatOutcome', () => {
        it('should return manage defender death if player dies', () => {
            combatPlayers.defender.attributes.currentHp = 0;
            service['managePlayerDeath'] = jest.fn();

            service['checkCombatOutcome'](room, combatPlayers);
            expect(service['managePlayerDeath']).toHaveBeenCalledWith(room, combatPlayers.attacker, combatPlayers.defender);
        });

        it('should return manage attacker death if player die', () => {
            combatPlayers.attacker.attributes.currentHp = 0;
            service['managePlayerDeath'] = jest.fn();

            service['checkCombatOutcome'](room, combatPlayers);
            expect(service['managePlayerDeath']).toHaveBeenCalledWith(room, combatPlayers.defender, combatPlayers.attacker);
        });

        it('should end turn', () => {
            jest.useFakeTimers();
            service['onEndTurn'] = jest.fn();

            service['checkCombatOutcome'](room, combatPlayers);
            jest.advanceTimersByTime(ROLL_DURATION);
            expect(service['onEndTurn']).toHaveBeenCalledWith(room);
        });
    });

    describe('handleTurnAfterCombat', () => {
        it('should continue turn if active player wins combat', () => {
            service['continuePlayerTurn'] = jest.fn();
            mockGameService.getActivePlayer = jest.fn().mockReturnValue(mockPlayers[0]);
            room.navigation.findReachableTiles = jest.fn().mockReturnValue([]);
            service['emitEventToRoom'] = jest.fn();

            service['handleTurnAfterCombat'](mockPlayers[0], room);

            expect(service['emitEventToRoom']).toHaveBeenCalledWith(room.roomId, ServerToClientEvent.ReachableTiles, []);
            expect(service['continuePlayerTurn']).toHaveBeenCalled();
        });

        it('should end turn if active player loses combat', () => {
            jest.useFakeTimers();
            mockGameService.getActivePlayer = jest.fn().mockReturnValue(mockPlayers[0]);
            room.navigation.findReachableTiles = jest.fn().mockReturnValue([]);
            mockGameService.onTurnEnded = jest.fn();
            service['emitEventToRoom'] = jest.fn();

            service['handleTurnAfterCombat'](defender, room);
            jest.advanceTimersByTime(END_COMBAT_DELAY);

            expect(mockGameService.onTurnEnded).toHaveBeenCalled();
        });
    });

    describe('getRandom', () => {
        it('should return a random number between 1 and max', () => {
            const max = 10;
            const randomValue = service['getRandomValue'](max);
            expect(randomValue).toBeGreaterThanOrEqual(1);
            expect(randomValue).toBeLessThanOrEqual(max);
        });
    });

    describe('isEvasionSuccessful', () => {
        it('should return true when Math.random() is less than EVASION_SUCCESS_RATE', () => {
            const successRate = EVASION_SUCCESS_RATE - 1;
            jest.spyOn(Math, 'random').mockReturnValue(successRate);

            const result = service['isEvasionSuccessful']();
            expect(result).toBe(true);
        });

        it('should return false when Math.random() is equal to or greater than EVASION_SUCCESS_RATE', () => {
            const successRate = EVASION_SUCCESS_RATE + 1;
            jest.spyOn(Math, 'random').mockReturnValue(successRate);

            const result = service['isEvasionSuccessful']();
            expect(result).toBe(false);
        });
    });

    describe('checkEndGame', () => {
        it('should not emit endGame if no player has reached the victory threshold', () => {
            const player1 = { id: '1', postGameStats: { victories: 2 } } as Player;
            service['emitEventToRoom'] = jest.fn();
            service['checkEndGame'](player1, room);

            expect(service['emitEventToRoom']).toHaveBeenCalledWith(room.roomId, ServerToClientEvent.CombatEnd, {
                listPlayers: room.listPlayers,
                player: player1,
            });
            expect(mockLogsService.sendEndGameLog).not.toHaveBeenCalled();
        });

        it('should emit endGame if player has reached the victory threshold', () => {
            room.gameMap.mode = GameMode.Classic;
            const winner = { id: '1', postGameStats: { victories: 3 } } as Player;
            service['checkEndGame'](winner, room);
            expect(mockGameService.onEndGame).toHaveBeenCalled();
            expect(mockLogsService.sendEndGameLog).toHaveBeenCalled();
        });
        it('should not emit endGame if player has reached the victory threshold and is in CTF mode', () => {
            const winner = { id: '1', postGameStats: { victories: 3 } } as Player;
            service['checkEndGame'](winner, room);

            expect(mockGameService.onEndGame).not.toHaveBeenCalled();
            expect(mockLogsService.sendEndGameLog).not.toHaveBeenCalled();
        });
    });

    it('should evade when evasion sucessfull', () => {
        service['emitToCombatPlayers'] = jest.fn();
        service['continuePlayerTurn'] = jest.fn();
        service['addToPostGameStats'] = jest.fn();

        service['handleEvasionSuccess'](room, 'evaderId');

        expect(service['emitToCombatPlayers']).toHaveBeenCalled();
        expect(service['continuePlayerTurn']).toHaveBeenCalledWith(room);
        expect(mockLogsService.sendCombatActionLog).toHaveBeenCalled();
        expect(mockLogsService.sendGlobalCombatLog).toHaveBeenCalled();
    });

    it('should addVictory combat finish', () => {
        mockClient.data.roomCode = room.roomId;
        service['isAttacker'] = jest.fn().mockReturnValue(true);
        service['resetCombatState'] = jest.fn();
        service['addVictory'] = jest.fn();
        mockLogsService.sendPlayerLog = jest.fn();

        service['handleCombatWon'](attacker, room);
        expect(service['resetCombatState']).toHaveBeenCalled();
    });

    it('should stop the fight timer and reset each player hp', () => {
        const player1 = { id: '1', attributes: { currentHp: 0 } } as Player;
        const player2 = { id: '2', attributes: { currentHp: 3 } } as Player;
        room.listPlayers.push(player1);
        room.listPlayers.push(player2);
        service['removeXiphosEffect'] = jest.fn();
        service['resetPlayerHealth'] = jest.fn();

        service['resetCombatState'](room);
        expect(mockGameService.getFightTimer).toHaveBeenCalledWith(room.roomId);
        expect(mockGameService.getFightTimer(room.roomId).stopTimer).toHaveBeenCalled();
        expect(service['removeXiphosEffect']).toHaveBeenCalled();
        expect(service['resetPlayerHealth']).toHaveBeenCalled();
    });

    it('should call onTurnEnded if time remaining is 0 or less', () => {
        jest.useFakeTimers();
        const player = mockPlayers[0];
        mockGameService.getActivePlayer.mockReturnValue(player);
        const mockSocket = { id: player.id } as Socket;
        mockServer.sockets.sockets.set(player.id, mockSocket);
        mockGameService.getTurnTimer.mockReturnValue({
            resumeTimer: jest.fn((callback: (timeRemaining: number) => void) => {
                callback(0);
            }),
        } as unknown as Timer);
        service['resetCombatState'] = jest.fn();

        service['continuePlayerTurn'](room);
        jest.advanceTimersByTime(END_COMBAT_DELAY);

        expect(mockGameService.onTurnEnded).toHaveBeenCalledWith(room);
    });

    it('should add victory', () => {
        service['checkEndGame'] = jest.fn();
        service['addToPostGameStats'] = jest.fn().mockReturnValueOnce(attacker);
        service['addVictory'](combatPlayers, room, true);
        expect(service['checkEndGame']).toHaveBeenCalled();
    });

    describe('replacePlayerOnSpawnPoint', () => {
        it('should return early if player not in room', () => {
            service['replacePlayerOnSpawnPoint'](mockPlayers[2], room);
        });

        it('should put player on its spawn if available', () => {
            const playerToReplace = mockPlayers[0];
            const oldPosition = playerToReplace.position;
            service['checkSpawnPointAvailability'] = jest.fn().mockReturnValue(true);
            service['replacePlayerOnNeighborTile'] = jest.fn();
            service['emitEventToRoom'] = jest.fn();

            service['replacePlayerOnSpawnPoint'](playerToReplace, room);
            expect(service['emitEventToRoom']).toHaveBeenCalledWith(room.roomId, ServerToClientEvent.RespawnPlayer, { oldPosition, playerToReplace });
            expect(playerToReplace.position).toEqual(playerToReplace.spawnPosition);
            expect(service['replacePlayerOnNeighborTile']).not.toHaveBeenCalled();
        });

        it('should put player on closed spawn if spawn not available', () => {
            const playerToReplace = mockPlayers[0];
            const oldPosition = playerToReplace.position;
            service['checkSpawnPointAvailability'] = jest.fn().mockReturnValue(false);
            service['replacePlayerOnNeighborTile'] = jest.fn();
            service['emitEventToRoom'] = jest.fn();

            service['replacePlayerOnSpawnPoint'](playerToReplace, room);

            expect(service['emitEventToRoom']).toHaveBeenCalledWith(room.roomId, ServerToClientEvent.RespawnPlayer, { oldPosition, playerToReplace });
            expect(service['replacePlayerOnNeighborTile']).toHaveBeenCalled();
        });
    });

    describe('checkSpawnPointAvailability', () => {
        it('should return true if player already on its spawn point', () => {
            const result = service['checkSpawnPointAvailability'](mockPlayers[0], [mockPlayers[0]]);
            expect(result).toBe(true);
        });

        it('should return true if no other player on its spawn point', () => {
            const otherPlayer = { position: { x: 3, y: 2 } } as unknown as Player;
            const result = service['checkSpawnPointAvailability'](mockPlayers[0], [otherPlayer]);
            expect(result).toBe(true);
        });

        it('should return false if other player on its spawn point', () => {
            const result = service['checkSpawnPointAvailability'](mockPlayers[0], [mockPlayers[1]]);
            expect(result).toBe(false);
        });
    });

    describe('replacePlayerOnNeighborTile', () => {
        it('should place the player on the first available neighbor tile', () => {
            const neighbor = [{ x: 0, y: 0 }];
            service['getNeighbors'] = jest.fn().mockReturnValue(neighbor);
            const result = service['replacePlayerOnNeighborTile'](mockPlayers[0], room.gameMap);
            expect(result).toEqual({ x: 0, y: 0 });
        });

        it('should handle recursion when all neighbors are occupied initially', () => {
            const player = mockPlayers[0];
            service['getNeighbors'] = jest
                .fn()
                .mockReturnValueOnce([{ x: 0, y: 1 }])
                .mockReturnValue([{ x: 0, y: 0 }]);

            const result = service['replacePlayerOnNeighborTile'](player, room.gameMap);

            expect(result).toEqual({ x: 0, y: 0 });
            expect(player.position).toEqual({ x: 0, y: 0 });
        });
    });

    it('should return valid neighbors within game boundaries', () => {
        const position = { x: 1, y: 1 };
        service['isValidTile'] = jest.fn().mockReturnValue(true);

        const neighbors = service['getNeighbors'](position, mockGame);

        expect(neighbors).toEqual([
            { x: 1, y: 2 },
            { x: 1, y: 0 },
            { x: 2, y: 1 },
            { x: 0, y: 1 },
        ]);
    });

    it('should return true if valid tile', () => {
        const result = service['isValidTile'](1, 1, mockGame.dimension);
        expect(result).toBe(true);
    });

    it('should handle combat won on default win', () => {
        service['getServer'] = jest.fn().mockReturnValue(mockServer);
        service['handleCombatWon'] = jest.fn();
        service['handleDefaultCombatWin'](room, mockPlayers[0]);
        expect(mockServer.to(mockPlayers[0].id).emit).toHaveBeenCalledWith(ServerToClientEvent.DefaultCombatWin);
        expect(service['handleCombatWon']).toHaveBeenLastCalledWith(mockPlayers[0], room);
    });

    describe('getOpponent', () => {
        it('should return undefined if client.data.roomCode is undefined', () => {
            mockClient.data.roomCode = undefined;
            const result = service['getOpponent'](mockClient);
            expect(result).toBeUndefined();
        });

        it('should return undefined if client.data is undefined', () => {
            mockClient.data = undefined;
            const result = service['getOpponent'](mockClient);
            expect(result).toBeUndefined();
        });

        it('should return attacker if player is defender', () => {
            mockClient.data.roomCode = room.roomId;
            const players = service.combatInfos.get(room.roomId).combatPlayers;
            players.attacker.id = mockClient.id;
            players.defender.id = 'defender123';

            const result = service['getOpponent'](mockClient);
            expect(result).toEqual(players.defender);
        });

        it('should return defender if player is attacker', () => {
            mockClient.data.roomCode = room.roomId;
            const players = service.combatInfos.get(room.roomId).combatPlayers;
            players.defender.id = mockClient.id;
            players.attacker.id = 'attacker123';

            const result = service['getOpponent'](mockClient);
            expect(result).toEqual(players.attacker);
        });
    });

    it('should decrease attack and defense if player on ice', () => {
        const iceTiles = [[TileType.Ice, TileType.Ice]];
        const playerOnIce = mockPlayers[0];
        service['handlePlayerOnIce'](playerOnIce, iceTiles, room.listPlayers);
        expect(playerOnIce.attributes.attack).toBe(ICE_TILE_PENALTY_VALUE);
        expect(playerOnIce.attributes.defense).toBe(ICE_TILE_PENALTY_VALUE);
    });

    it('should increment postGameStats for attacker and defender and return the attacker', () => {
        room.listPlayers = mockPlayers;

        const players: CombatPlayers = {
            attacker: mockPlayers[0],
            defender: mockPlayers[1],
        };

        const attr1 = PlayerStatType.Victories;
        const attr2 = PlayerStatType.Defeats;
        const result = service['addToPostGameStats'](room, players, attr1, attr2);

        expect(result).toEqual(mockPlayers[0]);
        expect(mockPlayers[0].postGameStats.victories).toBe(1);
        expect(mockPlayers[1].postGameStats.defeats).toBe(1);
    });

    it('should return null if either attacker or defender is not found', () => {
        room.listPlayers = mockPlayers;

        const players: CombatPlayers = {
            attacker: { id: mockPlayers[0].id } as Player,
            defender: { id: 'nonexistent-defender' } as Player,
        };

        const attr1 = PlayerStatType.Victories;
        const attr2 = PlayerStatType.Defeats;

        const result = service['addToPostGameStats'](room, players, attr1, attr2);

        expect(result).toBeNull();
    });

    describe('canBotAttack', () => {
        it('should return false if player not bot', () => {
            service['generateRandom'] = jest.fn().mockReturnValue(FIGHT_TIME);
            service['isPlayerBot'] = jest.fn().mockReturnValue(true);
            const result = service['canBotAttack'](FIGHT_TIME, FIGHT_TIME, combatPlayers);
            expect(result).toBe(false);
        });
    });

    describe('getTurnTime', () => {
        it('should return 1 if both players are bots', () => {
            service['isBothPlayersBot'] = jest.fn().mockReturnValue(true);
            const result = service['getTurnTime'](combatPlayers);
            expect(result).toBe(TWO_BOTS_FIGHT_TIME);
        });

        it('should return 3 if no more evasion', () => {
            service['isBothPlayersBot'] = jest.fn().mockReturnValue(false);
            service['hasEvasionLeft'] = jest.fn().mockReturnValue(false);

            const result = service['getTurnTime'](combatPlayers);
            expect(result).toBe(NO_EVASION_TIME);
        });
    });

    describe('hasValidActivePlayers', () => {
        it('should return false if no socket exists for the room', () => {
            const result = service['hasValidActivePlayers'](room);
            expect(result).toBe(false);
        });

        it('should return true if bot and player', () => {
            service['getServer'] = jest.fn().mockReturnValue(mockServer);
            mockServer.sockets.adapter.rooms.set(room.roomId, new Set([mockClient.id]));
            service['getPlayerConnectedInRoom'] = jest.fn().mockReturnValue([]);
            service['hasBotInPlayers'] = jest.fn().mockReturnValue(true);

            const result = service['hasValidActivePlayers'](room);
            expect(result).toBe(true);
        });

        it('should return true if more than one player', () => {
            service['getServer'] = jest.fn().mockReturnValue(mockServer);
            const player2 = { id: 'second' };
            mockServer.sockets.adapter.rooms.set(room.roomId, new Set([mockClient.id, player2.id]));
            service['getPlayerConnectedInRoom'] = jest.fn().mockReturnValue([]);
            service['hasBotInPlayers'] = jest.fn().mockReturnValue(false);

            const result = service['hasValidActivePlayers'](room);
            expect(result).toBe(true);
        });
    });

    it('should return only connected players', () => {
        const player1 = { status: Status.Disconnected } as Player;
        const player2 = { status: Status.Player } as Player;
        room.listPlayers = [player1, player2];

        const result = service['getPlayerConnectedInRoom'](room);
        expect(result).toEqual([player2]);
    });

    describe('hasBotInPlayers', () => {
        it('should return true if there is a bot', () => {
            const player1 = { status: Status.Disconnected } as Player;
            const player2 = { status: Status.Bot } as Player;
            const players = [player1, player2];

            const result = service['hasBotInPlayers'](players);
            expect(result).toEqual(true);
        });

        it('should return false if there is no bot', () => {
            const player1 = { status: Status.Disconnected } as Player;
            const player2 = { status: Status.PendingDisconnection } as Player;
            const players = [player1, player2];

            const result = service['hasBotInPlayers'](players);
            expect(result).toEqual(false);
        });
    });

    describe('isDefensiveBotDamaged', () => {
        it('should return true if the player is a bot, damaged, has evasion left, and is defensive', () => {
            const player = { attributes: { currentHp: 1, totalHp: 3 }, behavior: Behavior.Defensive } as Player;
            service['isPlayerBot'] = jest.fn().mockReturnValue(true);
            service['hasEvasionLeft'] = jest.fn().mockReturnValue(true);

            const result = service['isDefensiveBotDamaged'](player);
            expect(result).toBe(true);
        });
    });

    describe('hasXiphos', () => {
        it('should return true if the player has Xiphos in inventory', () => {
            const player = { inventory: [{ id: ObjectType.Xiphos }] } as Player;
            const result = service['hasXiphos'](player);
            expect(result).toBeTruthy();
        });

        it('should return false if the player does not have Xiphos in inventory', () => {
            const player = { inventory: [{ id: ObjectType.Trident }] } as Player;
            const result = service['hasXiphos'](player);
            expect(result).toBeFalsy();
        });
    });

    it('should return true if the player has Xiphos and half health', () => {
        service['hasXiphos'] = jest.fn().mockReturnValue(true);
        service['hasHealthBelowHalf'] = jest.fn().mockReturnValue(true);
        const result = service['isXiphosActive'](attacker);
        expect(result).toBe(true);
    });

    it('should return true if the player has half health', () => {
        const player = { attributes: { currentHp: 3, totalHp: 7 } } as Player;
        const result = service['hasHealthBelowHalf'](player);
        expect(result).toBe(true);
    });

    it('should return true if the player is attacker', () => {
        const result = service['isAttacker'](attacker, combatPlayers);
        expect(result).toBe(true);
    });

    it('should apply xiphos effect', () => {
        attacker.attributes.attack = DEFAULT_ATTRIBUTE;
        defender.attributes.defense = DEFAULT_ATTRIBUTE;
        service['applyXiphosEffect'](attacker, defender, room.roomId);
        expect(attacker.attributes.attack).toBe(DEFAULT_ATTRIBUTE + XIPHOS_ATTACK_BONUS);
        expect(defender.attributes.defense).toBe(DEFAULT_ATTRIBUTE - XIPHOS_DEFENSE_PENALTY);
    });

    it('should return true if affected by xiphos', () => {
        service['hasXiphos'] = jest.fn().mockReturnValue(true);
        const result = service['isPlayerAffectedByXiphos'](attacker, true);
        expect(result).toBe(true);
    });

    describe('removeXiphosEffect', () => {
        it('should call updateXiphosAttributes if attacker affected', () => {
            service['isPlayerAffectedByXiphos'] = jest.fn().mockReturnValue(true);
            service['updateXiphosAttributes'] = jest.fn();

            service['removeXiphosEffect'](combatPlayers, true);
            expect(service['updateXiphosAttributes']).toHaveBeenCalledWith(attacker, defender);
            expect(service['isPlayerAffectedByXiphos']).toHaveBeenCalledWith(attacker, true);
        });
        it('should call updateXiphosAttributes if defender affected', () => {
            service['isPlayerAffectedByXiphos'] = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);
            service['updateXiphosAttributes'] = jest.fn();

            service['removeXiphosEffect'](combatPlayers, true);
            expect(service['updateXiphosAttributes']).toHaveBeenCalledWith(defender, attacker);
            expect(service['isPlayerAffectedByXiphos']).toHaveBeenCalledWith(defender, true);
        });
    });

    it('should update xiphos attributes', () => {
        attacker.attributes.attack = DEFAULT_ATTRIBUTE;
        defender.attributes.defense = DEFAULT_ATTRIBUTE;
        service['updateXiphosAttributes'](attacker, defender);
        expect(attacker.attributes.attack).toBe(DEFAULT_ATTRIBUTE - XiphosEffect.Attack);
        expect(defender.attributes.defense).toBe(DEFAULT_ATTRIBUTE + XiphosEffect.Defense);
    });

    it('should reset ice penalty on ice tile', () => {
        attacker.attributes.attack = DEFAULT_ATTRIBUTE;
        attacker.attributes.defense = DEFAULT_ATTRIBUTE;
        room.gameMap.tiles = [[TileType.Ice, TileType.Ice]];
        service['resetPlayerIcePenalty'](room, attacker);
        expect(attacker.attributes.attack).toBe(DEFAULT_ATTRIBUTE + ICE_TILE_PENALTY_VALUE);
        expect(attacker.attributes.defense).toBe(DEFAULT_ATTRIBUTE + ICE_TILE_PENALTY_VALUE);
    });

    it('should apply xiphos effect', () => {
        service['isXiphosActive'] = jest.fn().mockReturnValue(true);
        service['applyXiphosEffect'] = jest.fn();

        service['checkXiphos'](combatPlayers, room);
        expect(service['applyXiphosEffect']).toHaveBeenCalled();
    });

    describe('checkAchillesArmor', () => {
        it('should return true and reduce hp', () => {
            service['hasAchillesArmor'] = jest.fn().mockReturnValue(true);
            expect(service['checkAchillesArmor'](attacker)).toBe(true);
        });

        it('should return true and reduce hp', () => {
            service['hasAchillesArmor'] = jest.fn().mockReturnValue(false);
            expect(service['checkAchillesArmor'](attacker)).toBe(false);
        });
    });

    describe('hasAchillesArmor', () => {
        it('should return true if the player has Achilles Armor in inventory', () => {
            const player = { inventory: [{ id: ObjectType.Armor }] } as Player;
            const result = service['hasAchillesArmor'](player);
            expect(result).toBeTruthy();
        });

        it('should return false if the player does not have Achilles Armor in inventory', () => {
            const player = { inventory: [{ id: ObjectType.Trident }] } as Player;
            const result = service['hasAchillesArmor'](player);
            expect(result).toBeFalsy();
        });
    });

    describe('addStatsForWinLoss', () => {
        it('should return attacker if attacker wins', () => {
            room.listPlayers = [attacker, defender];
            const result = service['addStatsForWinLoss'](room, combatPlayers, true);
            expect(result).toBe(attacker);
        });

        it('should return defender if defender win', () => {
            room.listPlayers = [attacker, defender];
            const result = service['addStatsForWinLoss'](room, combatPlayers, false);
            expect(result).toBe(defender);
        });
    });

    it('should return defender if defender wins', () => {
        const player = { attributes: { speed: 1 } } as Player;
        const opponent = { attributes: { speed: 10 } } as Player;
        const combatActionData = {
            clickedPosition: { x: 0, y: 1 },
            player,
        };

        const result = service['setFirstAttacker'](combatActionData, opponent);
        expect(result).toEqual([opponent, combatActionData.player]);
    });

    it('should call emitEventToRoom', () => {
        mockGameService.emitEventToRoom = jest.fn();
        service['emitEventToRoom'](room.roomId, ServerToClientEvent.ActivePlayer);
        expect(mockGameService.emitEventToRoom).toHaveBeenCalled();
    });

    describe('syncWithCombat', () => {
        it('should emit combat data when combat is active', () => {
            const spectator = { emit: jest.fn() } as unknown as Socket;
            const fightTimerMock = {
                resetTimer: jest.fn(),
                stopTimer: jest.fn(),
                getTimeRemaining: jest.fn().mockReturnValue(FIGHT_TIME),
            } as unknown as Timer;
            mockGameService.getFightTimer = jest.fn().mockReturnValue(fightTimerMock);

            combatInfos.room = room;
            combatInfos.combatPlayers = combatPlayers;
            room.listPlayers = [
                { ...combatPlayers.attacker, isActive: true } as Player,
                combatPlayers.defender,
            ];
            service.combatInfos.set(room.roomId, combatInfos);

            service.syncWithCombat(room.roomId, spectator);

            expect(spectator.emit).toHaveBeenCalledWith(
                ServerToClientEvent.StartFight,
                expect.objectContaining({ combatPlayers }),
            );
            expect(spectator.emit).toHaveBeenCalledWith(ServerToClientEvent.CombatInProgress);
            expect(spectator.emit).toHaveBeenCalledWith(
                ServerToClientEvent.CombatTime,
                FIGHT_TIME,
            );
        });

        it('should not emit when no combat info exists', () => {
            const spectator = { emit: jest.fn() } as unknown as Socket;
            service.combatInfos.delete(room.roomId);

            service.syncWithCombat(room.roomId, spectator);

            expect(spectator.emit).not.toHaveBeenCalled();
        });
    });
});
