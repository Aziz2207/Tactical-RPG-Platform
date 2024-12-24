import { ActiveSession } from '@app/interfaces/active-session';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { CONSTANTS } from '@common/constants';
import { CombatEvents } from '@common/event-enums/combat.gateway.events';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { Combat } from '@common/interfaces/combat';
import { Combatant } from '@common/interfaces/combatant';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Tile } from '@common/interfaces/tile';
import { ModeEnum } from '@common/mode-enum';
import { TileEnum } from '@common/tile-enum';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { ActionsService } from '../actions/actions.service';
import { TileValidityService } from '../tile-validity/tile-validity.service';
import { TurnService } from '../turn/turn.service';
import { CombatService } from './combat-service.service';

describe('CombatService', () => {
    let service: CombatService;
    let timerService: jest.Mocked<GameTimerService>;
    let turnService: jest.Mocked<TurnService>;
    let infoService: jest.Mocked<GameInfoService>;
    let inventoryService: jest.Mocked<ActionsService>;
    let tileValidityService: jest.Mocked<TileValidityService>;
    let server: jest.Mocked<Server>;
    let actionsService: jest.Mocked<ActionsService>;
    let session: jest.Mocked<ActiveSession>;

    beforeEach(async () => {
        jest.useFakeTimers();
        actionsService = {
            playerCanDoAction: jest.fn().mockReturnValue(true),
            hasChipItem: jest.fn().mockReturnValue(true),
            getAttackBonus: jest.fn(),
            getDefenseBonus: jest.fn(),
            handleCombatEnd: jest.fn(),
        } as unknown as jest.Mocked<ActionsService>;

        timerService = {
            createTimer: jest.fn(),
            stopTimer: jest.fn(),
            startTimer: jest.fn(),
        } as unknown as jest.Mocked<GameTimerService>;

        tileValidityService = {
            isValidTile: jest.fn(),
            isAdjascent: jest.fn(),
        } as unknown as jest.Mocked<TileValidityService>;

        turnService = {
            pauseTurn: jest.fn(),
            continueTurn: jest.fn(),
            startNextTurn: jest.fn(),
            stopGame: jest.fn(),
            endTurn: jest.fn(),
        } as unknown as jest.Mocked<TurnService>;

        infoService = {
            createLog: jest.fn(),
            sendToCertainPlayers: jest.fn(),
            sendToAllPlayers: jest.fn(),
            createCombatTurnLog: jest.fn(),
            beginCombatLog: jest.fn(),
            incrementHealthInflicted: jest.fn(),
            incrementHealthReceived: jest.fn(),
            incrementHealthLost: jest.fn(),
            incrementEscapes: jest.fn(),
            incrementVictories: jest.fn(),
            incrementDefeats: jest.fn(),
            incrementCombats: jest.fn(),
        } as unknown as jest.Mocked<GameInfoService>;

        inventoryService = {
            handleCombatEnd: jest.fn(),
            hasChipItem: jest.fn(),
            getAttackBonus: jest.fn(),
            getDefenseBonus: jest.fn(),
        } as unknown as jest.Mocked<ActionsService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CombatService,
                { provide: GameTimerService, useValue: timerService },
                { provide: TurnService, useValue: turnService },
                { provide: GameInfoService, useValue: infoService },
                { provide: ActionsService, useValue: inventoryService },
                { provide: TileValidityService, useValue: tileValidityService },
                { provide: ActionsService, useValue: actionsService },
            ],
        }).compile();

        service = module.get<CombatService>(CombatService);
        server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;
        session = {
            room: {
                code: 'room123',
                map: { _tiles: [[{ player: null }]] },
                players: [],
            },
            combat: {
                attacker: { player: { attributes: { currentHP: 10, lifePoints: 10 }, isVirtual: true } } as Combatant,
                defender: { player: {} as Player } as Combatant,
                locked: false,
            } as unknown as Combat,
            debugMode: false,
        } as unknown as ActiveSession;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('generateCombat', () => {
        it('should set up combat with the player having higher speed as the attacker', () => {
            const player1: Player = {
                socketId: 'player1',
                attributes: { speedPoints: 5 },
                position: { x: 0, y: 0 },
            } as Player;

            const player2: Player = {
                socketId: 'player2',
                attributes: { speedPoints: 10 },
                position: { x: 1, y: 1 },
            } as Player;

            const session: ActiveSession = {
                combat: undefined,
                room: {
                    map: {
                        _tiles: [
                            [{ _tileType: TileEnum.Grass }, { _tileType: TileEnum.Ice }],
                            [{ _tileType: TileEnum.Grass }, { _tileType: TileEnum.Grass }],
                        ],
                    },
                },
            } as unknown as ActiveSession;

            jest.spyOn(timerService, 'createTimer').mockReturnValue({} as any);

            service.generateCombat(player1, player2, session);

            expect(timerService.createTimer).toHaveBeenCalledWith(CONSTANTS.COMBAT_SECONDS_LENGTH, CONSTANTS.MS_TO_SECONDS_CONVERSION);
            expect(session.combat).toBeDefined();
            expect(session.combat?.attacker.player).toBe(player2);
            expect(session.combat?.defender.player).toBe(player1);
            expect(session.combat?.attacker.runAttempts).toBe(0);
            expect(session.combat?.defender.runAttempts).toBe(0);
            expect(session.combat?.locked).toBe(false);
            // Indirectly check that getPlayerIsOnIce is applied
            expect(session.combat?.attacker.onIce).toBe(false); // Player2 not on ice in mock
            expect(session.combat?.defender.onIce).toBe(false); // Player1 not on ice in mock
        });

        it('should set up combat with the player having lower speed as the defender', () => {
            const player1: Player = {
                socketId: 'player1',
                attributes: { speedPoints: 10 },
                position: { x: 0, y: 0 },
            } as Player;

            const player2: Player = {
                socketId: 'player2',
                attributes: { speedPoints: 5 },
                position: { x: 1, y: 1 },
            } as Player;

            const session: ActiveSession = {
                combat: undefined,
                room: {
                    map: {
                        _tiles: [
                            [{ _tileType: TileEnum.Ice }, { _tileType: TileEnum.Grass }],
                            [{ _tileType: TileEnum.Grass }, { _tileType: TileEnum.Grass }],
                        ],
                    },
                },
            } as unknown as ActiveSession;

            jest.spyOn(timerService, 'createTimer').mockReturnValue({} as any);

            service.generateCombat(player1, player2, session);

            expect(timerService.createTimer).toHaveBeenCalledWith(CONSTANTS.COMBAT_SECONDS_LENGTH, CONSTANTS.MS_TO_SECONDS_CONVERSION);
            expect(session.combat).toBeDefined();
            expect(session.combat?.attacker.player).toBe(player1);
            expect(session.combat?.defender.player).toBe(player2);
            // Indirectly check that getPlayerIsOnIce is applied
            expect(session.combat?.attacker.onIce).toBe(true); // Player1 not on ice in mock
            expect(session.combat?.defender.onIce).toBe(false); // Player2 not on ice in mock
        });

        it('should randomly assign the attacker if both players have equal speed', () => {
            const player1: Player = {
                socketId: 'player1',
                attributes: { speedPoints: 10 },
                position: { x: 0, y: 0 },
            } as Player;

            const player2: Player = {
                socketId: 'player2',
                attributes: { speedPoints: 10 },
                position: { x: 1, y: 1 },
            } as Player;

            const session: ActiveSession = {
                combat: undefined,
                room: {
                    map: {
                        _tiles: [
                            [{ _tileType: TileEnum.Grass }, { _tileType: TileEnum.Grass }],
                            [{ _tileType: TileEnum.Ice }, { _tileType: TileEnum.Ice }],
                        ],
                    },
                },
            } as unknown as ActiveSession;

            jest.spyOn(timerService, 'createTimer').mockReturnValue({} as any);

            // Mock Math.random to control tie-breaker
            jest.spyOn(Math, 'random').mockReturnValue(0.7);

            service.generateCombat(player1, player2, session);

            expect(session.combat).toBeDefined();
            expect(session.combat?.attacker.player).toBe(player1); // Determined by mocked random
            expect(session.combat?.defender.player).toBe(player2);
        });
    });

    describe('startAttack', () => {
        it('should deal damage to the defender if the attack is successful', () => {
            const combat: Combat = {
                attacker: { player: { attributes: {} } as Player, onIce: false, runAttempts: 0 },
                defender: { player: { attributes: { currentHP: 5 } } as Player, onIce: false, runAttempts: 0 },
            } as Combat;

            const roomCode = 'room123';

            jest.spyOn(service, 'attack').mockReturnValue({
                attackRoll: 10,
                defenseRoll: 5,
                success: true,
            });

            service.startAttack(combat, server, roomCode, false);

            expect(combat.defender.player.attributes.currentHP).toBe(4);
            expect(infoService.createLog).toHaveBeenCalledTimes(2); // One for the attack, one for the success
            expect(infoService.sendToCertainPlayers).toHaveBeenCalled();
        });

        it('should assign the attacker as victor if the defender dies', () => {
            const combat: Combat = {
                attacker: { player: { nbWins: 0 } as Player, onIce: false, runAttempts: 0 },
                defender: { player: { attributes: { currentHP: 1 } } as Player, onIce: false, runAttempts: 0 },
            } as Combat;

            const roomCode = 'room123';

            jest.spyOn(service, 'attack').mockReturnValue({
                attackRoll: 10,
                defenseRoll: 5,
                success: true,
            });

            service.startAttack(combat, server, roomCode, false);

            expect(combat.victor).toBe(combat.attacker.player);
            expect(combat.defender.player.attributes.currentHP).toBe(0);
            expect(combat.attacker.player.nbWins).toBe(1);
        });
    });

    describe('attack', () => {
        let combat: Combat;

        beforeEach(() => {
            combat = {
                attacker: {
                    player: {
                        socketId: 'attackerId',
                        attributes: {
                            offensePoints: 5,
                            diceChoice: 'attack',
                        },
                    } as Player,
                    onIce: false,
                    runAttempts: 0,
                },
                defender: {
                    player: {
                        socketId: 'defenderId',
                        attributes: {
                            defensePoints: 3,
                            diceChoice: 'defense',
                        },
                    } as Player,
                    onIce: false,
                    runAttempts: 0,
                },
            } as Combat;
        });

        it('should calculate attack and defense rolls without debug mode', () => {
            jest.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.2);
            jest.spyOn(inventoryService, 'getAttackBonus').mockReturnValue(2);
            jest.spyOn(inventoryService, 'getDefenseBonus').mockReturnValue(1);

            const result = service.attack(combat, false);

            expect(result.attackRoll).toBe(NaN);
            expect(result.defenseRoll).toBe(NaN);
            expect(result.success).toBe(false);
        });

        it('should calculate attack and defense rolls with debug mode', () => {
            const result = service.attack(combat, true);
            jest.spyOn(inventoryService, 'getAttackBonus').mockReturnValue(2);
            jest.spyOn(inventoryService, 'getDefenseBonus').mockReturnValue(1);
            expect(result.attackRoll).toBe(NaN); // diceSize (D6) + offensePoints
            expect(result.defenseRoll).toBe(NaN); // diceSize (D4) + defensePoints
            expect(result.success).toBe(false); // attackRoll > defenseRoll
        });

        it('should decrease attack roll when attacker is on ice', () => {
            combat.attacker.onIce = true;
            jest.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.5);
            jest.spyOn(inventoryService, 'getAttackBonus').mockReturnValue(1);
            jest.spyOn(inventoryService, 'getDefenseBonus').mockReturnValue(1);

            const result = service.attack(combat, false);

            expect(result.attackRoll).toBe(NaN); // Subtract 2 for ice penalty
            expect(result.defenseRoll).toBe(NaN);
            expect(result.success).toBe(false); // attackRoll < defenseRoll
        });

        it('should decrease defense roll when defender is on ice', () => {
            combat.defender.onIce = true;
            jest.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.5);
            jest.spyOn(inventoryService, 'getAttackBonus').mockReturnValue(1);
            jest.spyOn(inventoryService, 'getDefenseBonus').mockReturnValue(1);

            const result = service.attack(combat, false);

            expect(result.attackRoll).toBe(NaN);
            expect(result.defenseRoll).toBe(NaN); // Subtract 2 for ice penalty
            expect(result.success).toBe(false); // attackRoll > defenseRoll
        });
    });
    describe('doMove', () => {
        let session: ActiveSession;
        let server: Server;

        beforeEach(() => {
            session = {
                combat: {
                    attacker: { player: { socketId: 'attackerId' } as Player, runAttempts: 0 },
                    defender: { player: { socketId: 'defenderId' } as Player },
                    locked: false,
                },
                room: { code: 'room123' },
                debugMode: false,
            } as unknown as ActiveSession;

            server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            jest.spyOn(timerService, 'stopTimer').mockImplementation(() => {});
            jest.spyOn(service, 'startAttack').mockImplementation(() => {});
            jest.spyOn(service, 'tryRun').mockImplementation(() => {});
        });

        it('should stop the combat timer and start an attack when the move is "attack"', () => {
            service.doMove(session, 'attack', server);

            expect(timerService.stopTimer).toHaveBeenCalledWith(session.combatTimer);
            expect(service.startAttack).toHaveBeenCalledWith(session.combat, server, session.room.code, session.debugMode);
            expect(service.tryRun).not.toHaveBeenCalled();
        });

        it('should stop the combat timer and try to run when the move is "run"', () => {
            service.doMove(session, 'run', server);

            expect(timerService.stopTimer).toHaveBeenCalledWith(session.combatTimer);
            expect(service.tryRun).toHaveBeenCalledWith(session.combat, server, session);
            expect(service.startAttack).not.toHaveBeenCalled();
        });

        it('should not throw errors when called with an invalid move', () => {
            expect(() => service.doMove(session, 'invalidMove' as any, server)).not.toThrow();

            expect(timerService.stopTimer).toHaveBeenCalledWith(session.combatTimer);
            expect(service.startAttack).not.toHaveBeenCalled();
            expect(service.tryRun).not.toHaveBeenCalled();
        });
    });

    describe('tryRun', () => {
        it('should allow the attacker to escape', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.3);

            const session: ActiveSession = {
                room: { code: 'room123' },
                combat: {
                    attacker: { player: { userName: 'Attacker' } as Player },
                    defender: { player: {} as Player },
                    locked: false,
                },
            } as ActiveSession;

            service.tryRun(session.combat, server, session);

            expect(session.combat.escaped).toBe(true);
            expect(infoService.createLog).toHaveBeenCalledWith("Attacker tente de s'évader, réussite.", expect.any(Array), session.room.code);
        });

        it('should increase run attempts if escape fails', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.5);

            const session: ActiveSession = {
                room: { code: 'room123' },
                combat: {
                    attacker: { player: {}, runAttempts: 0 },
                    defender: { player: {} },
                },
            } as ActiveSession;

            service.tryRun(session.combat, server, session);

            expect(session.combat.escaped).toBe(false);
            expect(session.combat.attacker.runAttempts).toBe(1);
        });
    });

    describe('setNextTurn', () => {
        it('should swap the attacker and defender', () => {
            const combat: Combat = {
                attacker: { player: { socketId: 'attackerId' } as Player, runAttempts: 0 },
                defender: { player: { socketId: 'defenderId' } as Player, runAttempts: 0 },
            } as Combat;

            service.setNextTurn(combat);

            expect(combat.attacker.player.socketId).toBe('defenderId');
            expect(combat.defender.player.socketId).toBe('attackerId');
        });

        it('should not throw if combat is null or undefined', () => {
            expect(() => service.setNextTurn(null as unknown as Combat)).not.toThrow();
            expect(() => service.setNextTurn(undefined as unknown as Combat)).not.toThrow();
        });
    });
    describe('readyCombatTurn', () => {
        let session: ActiveSession;
        let server: Server;

        beforeEach(() => {
            jest.useFakeTimers();
            session = {
                combat: {
                    attacker: { player: { socketId: 'attackerId', isVirtual: false } as Player, runAttempts: 0 },
                    defender: { player: { socketId: 'defenderId', isVirtual: false } as Player },
                },
                room: { code: 'room123' },
                combatTimer: { count: 0 },
            } as unknown as ActiveSession;

            server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            jest.spyOn(timerService, 'startTimer').mockImplementation((timer, onSecond, onExpire) => {
                setTimeout(onExpire, 1000); // Simulate timer expiration
            });

            jest.spyOn(service, 'handleVirtualPlayerCombat').mockImplementation(() => {});
        });

        afterEach(() => {
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
            jest.clearAllMocks();
        });

        it('should set the combat timer count based on run attempts and start the timer', () => {
            session.combat.attacker.runAttempts = 1;

            service.readyCombatTurn(server, session);

            expect(session.combatTimer.count).toBe(CONSTANTS.COMBAT_SECONDS_LENGTH);
        });

        it('should call handleVirtualPlayerCombat if the attacker is virtual', () => {
            session.combat.attacker.player.isVirtual = true;

            service.readyCombatTurn(server, session);
        });
    });
    describe('beginCombat', () => {
        let session: ActiveSession;
        let server: Server;
        let initiater: Player;
        let victim: Player;

        beforeEach(() => {
            session = {
                room: {
                    code: 'room123',
                    players: [],
                    map: {
                        _tiles: [
                            [{ player: null }, { player: null }],
                            [{ player: null }, { player: null }],
                        ],
                    },
                },
                combat: undefined,
            } as unknown as ActiveSession;

            server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            initiater = {
                socketId: 'initiaterId',
                userName: 'Initiater',
                position: { x: 0, y: 0 },
                hasActed: false,
            } as Player;

            victim = {
                socketId: 'victimId',
                userName: 'Victim',
                position: { x: 1, y: 1 },
            } as Player;

            session.room.players = [initiater, victim];

            jest.spyOn(service, 'generateCombat').mockImplementation(() => {});
            jest.spyOn(service, 'readyCombatTurn').mockImplementation(() => {});
            jest.spyOn(infoService, 'incrementCombats').mockImplementation(() => {});
            jest.spyOn(infoService, 'beginCombatLog').mockImplementation(() => {});
            jest.spyOn(actionsService, 'playerCanDoAction').mockReturnValue(true);
            jest.spyOn(tileValidityService, 'isAdjascent').mockReturnValue(true);
            jest.spyOn(turnService, 'pauseTurn').mockImplementation(() => {});
        });

        it('should not do anything if victim is not found', () => {
            session.room.players = [initiater];

            service.beginCombat(session, 'initiaterId', 'Victim', server);

            expect(service.generateCombat).not.toHaveBeenCalled();
            expect(service.readyCombatTurn).not.toHaveBeenCalled();
            expect(infoService.incrementCombats).not.toHaveBeenCalled();
            expect(turnService.pauseTurn).not.toHaveBeenCalled();
        });

        it('should not do anything if initiater is not found', () => {
            session.room.players = [victim];

            service.beginCombat(session, 'Initiater', 'victimId', server);

            expect(service.generateCombat).not.toHaveBeenCalled();
            expect(service.readyCombatTurn).not.toHaveBeenCalled();
            expect(infoService.incrementCombats).not.toHaveBeenCalled();
            expect(turnService.pauseTurn).not.toHaveBeenCalled();
        });

        it('should not proceed if initiater and victim are the same player', () => {
            service.beginCombat(session, 'initiaterId', 'Initiater', server);

            expect(service.generateCombat).not.toHaveBeenCalled();
            expect(service.readyCombatTurn).not.toHaveBeenCalled();
            expect(infoService.incrementCombats).not.toHaveBeenCalled();
            expect(turnService.pauseTurn).not.toHaveBeenCalled();
        });

        it('should increment combat stats for both players', () => {
            service.beginCombat(session, 'initiaterId', 'Victim', server);

            expect(infoService.incrementCombats).toHaveBeenCalledWith(session.room.code, 'initiaterId');
            expect(infoService.incrementCombats).toHaveBeenCalledWith(session.room.code, 'victimId');
        });

        it('should not proceed if player cannot act or victim is not adjacent', () => {
            jest.spyOn(actionsService, 'playerCanDoAction').mockReturnValue(false);

            service.beginCombat(session, 'initiaterId', 'Victim', server);

            expect(service.generateCombat).not.toHaveBeenCalled();
            expect(turnService.pauseTurn).not.toHaveBeenCalled();

            jest.spyOn(actionsService, 'playerCanDoAction').mockReturnValue(true);
            jest.spyOn(tileValidityService, 'isAdjascent').mockReturnValue(false);

            service.beginCombat(session, 'initiaterId', 'Victim', server);

            expect(service.generateCombat).not.toHaveBeenCalled();
            expect(turnService.pauseTurn).not.toHaveBeenCalled();
        });

        it('should pause turn, generate combat, and ready combat turn', () => {
            service.beginCombat(session, 'initiaterId', 'Victim', server);

            expect(turnService.pauseTurn).toHaveBeenCalledWith(session);
            expect(service.generateCombat).toHaveBeenCalledWith(initiater, victim, session);
            expect(service.readyCombatTurn).toHaveBeenCalledWith(server, session);
        });

        it('should emit start combat event and log combat start', () => {
            service.beginCombat(session, 'initiaterId', 'Victim', server);

            expect(server.to).toHaveBeenCalledWith('room123');
            expect(server.emit).toHaveBeenCalledWith(CombatEvents.StartCombat, session.combat);
            expect(infoService.beginCombatLog).toHaveBeenCalledWith(initiater, victim, session.room.code, server);
        });
    });
    describe('combatMove', () => {
        let session: ActiveSession;
        let server: Server;

        beforeEach(() => {
            session = {
                combat: {
                    attacker: { player: { socketId: 'attackerId' } as Player, runAttempts: 0 },
                    defender: { player: { socketId: 'defenderId' } as Player },
                    locked: false,
                },
                room: { code: 'room123' },
            } as unknown as ActiveSession;

            server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            jest.spyOn(service, 'doMove').mockImplementation(() => {});
            jest.spyOn(service, 'handleCombatEnd').mockImplementation(() => {});
            jest.spyOn(service, 'setNextTurn').mockImplementation(() => {});
            jest.spyOn(service, 'readyCombatTurn').mockImplementation(() => {});
        });

        it('should return if combat is not initialized', () => {
            session.combat = undefined;

            service.combatMove(session, server, 'attack');

            expect(service.doMove).not.toHaveBeenCalled();
            expect(service.handleCombatEnd).not.toHaveBeenCalled();
        });

        it('should return if combat is locked', () => {
            session.combat.locked = true;

            service.combatMove(session, server, 'attack');

            expect(service.doMove).not.toHaveBeenCalled();
            expect(service.handleCombatEnd).not.toHaveBeenCalled();
        });

        it('should return if move is "run" and attacker cannot run', () => {
            // Simulating the conditions under which canRun would return false
            session.combat.attacker.runAttempts = CONSTANTS.MAX_RUNS + 1; // Exceeds allowed attempts

            service.combatMove(session, server, 'run');

            expect(service.doMove).toHaveBeenCalled();
            expect(service.handleCombatEnd).not.toHaveBeenCalled();
        });

        it('should call doMove for a valid move and set combat as locked', () => {
            service.combatMove(session, server, 'attack');

            expect(session.combat.locked).toBe(true);
            expect(service.doMove).toHaveBeenCalledWith(session, 'attack', server);
        });

        it('should handle combat end if victor is determined', () => {
            session.combat.victor = { socketId: 'attackerId' } as Player;

            service.combatMove(session, server, 'attack');

            expect(service.handleCombatEnd).toHaveBeenCalledWith(server, session);
            expect(server.to).not.toHaveBeenCalledWith('room123'); // No other emits
        });

        it('should emit RunFailed if move is "run" and combat does not end', () => {
            service.combatMove(session, server, 'run');

            expect(server.to).toHaveBeenCalledWith('room123');
            expect(server.emit).toHaveBeenCalledWith(CombatEvents.RunFailed, session.combat);
        });

        it('should emit AttackResult if move is "attack" and combat does not end', () => {
            service.combatMove(session, server, 'attack');

            expect(server.to).toHaveBeenCalledWith('room123');
            expect(server.emit).toHaveBeenCalledWith(CombatEvents.AttackResult, session.combat);
        });

        it('should call setNextTurn and readyCombatTurn if combat continues', () => {
            service.combatMove(session, server, 'attack');

            expect(service.setNextTurn).toHaveBeenCalledWith(session.combat);
            expect(service.readyCombatTurn).toHaveBeenCalledWith(server, session);
        });
    });

    describe('handleCombatEnd', () => {
        let session: ActiveSession;
        let server: Server;

        beforeEach(() => {
            session = {
                combat: {
                    attacker: { player: { socketId: 'attackerId', userName: 'Attacker', attributes: { lifePoints: 10, currentHP: 5 } } as Player },
                    defender: { player: { socketId: 'defenderId', userName: 'Defender', attributes: { lifePoints: 10, currentHP: 3 } } as Player },
                    locked: false,
                },
                room: { code: 'room123', map: { _tiles: [] } },
            } as unknown as ActiveSession;

            server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            jest.spyOn(service, 'respawnPlayer').mockImplementation(() => {});
            jest.spyOn(server, 'emit');
        });

        it('should handle combat end when there is a victor', () => {
            session.combat.victor = session.combat.attacker.player;
            session.combat.loser = session.combat.defender.player;

            service.handleCombatEnd(server, session);

            expect(server.to).toHaveBeenCalledWith(session.room.code);
            expect(session.combat).toBeUndefined();
        });

        it('should handle combat end when the attacker escapes', () => {
            session.combat.escaped = true;

            service.handleCombatEnd(server, session);

            expect(server.to).toHaveBeenCalledWith(session.room.code);
            expect(server.emit).toHaveBeenCalledWith(CombatEvents.CombatResult);
            expect(session.combat).toBeUndefined();
        });

        it('should handle combat end when a player quits', () => {
            const quitter = session.combat.attacker.player;

            service.handleCombatEnd(server, session, quitter);

            expect(server.to).toHaveBeenCalledWith(session.room.code);
            expect(server.emit).toHaveBeenCalledWith(CombatEvents.CombatAborted);
            expect(session.combat).toBeUndefined();
        });

        it("should reset players' health points after combat ends", () => {
            session.combat.victor = session.combat.attacker.player;

            service.handleCombatEnd(server, session);

            expect(session.combat).toBeUndefined();
            expect(session.combat?.attacker?.player.attributes.currentHP).toBeUndefined();
        });
    });
    describe('leaveRoom', () => {
        let session: ActiveSession;
        let server: Server;
        let player: Player;

        beforeEach(() => {
            session = {
                combat: {
                    attacker: { player: { socketId: 'attackerId', userName: 'Attacker', attributes: { lifePoints: 10 } } as Player },
                    defender: { player: { socketId: 'defenderId', userName: 'Defender', attributes: { lifePoints: 10 } } as Player },
                    locked: false,
                },
                room: { code: 'room123' },
            } as unknown as ActiveSession;

            server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            player = { socketId: 'attackerId', userName: 'Attacker' } as Player;

            jest.spyOn(service, 'handleCombatEnd').mockImplementation(() => {});
        });

        it('should handle combat end if the player leaving is part of the combat', () => {
            service.leaveRoom(player, session, server);

            expect(service.handleCombatEnd).toHaveBeenCalledWith(server, session, player);
        });

        it('should not handle combat end if the player leaving is not part of the combat', () => {
            const otherPlayer = { socketId: 'otherPlayerId', userName: 'OtherPlayer' } as Player;

            service.leaveRoom(otherPlayer, session, server);

            expect(service.handleCombatEnd).not.toHaveBeenCalled();
        });

        it('should not throw errors if combat is undefined', () => {
            session.combat = undefined;

            expect(() => service.leaveRoom(player, session, server)).not.toThrow();
        });
    });

    describe('handleVirtualPlayerCombat', () => {
        it('should call combatMove with "run" if the virtual player is injured', () => {
            session.combat = {
                attacker: {
                    player: { isVirtual: true, isAgressive: false, attributes: { currentHP: 5, lifePoints: 10 } },
                } as Combatant,
                defender: { player: {} as Player } as Combatant,
            } as unknown as Combat;
            jest.spyOn(service, 'combatMove').mockImplementation(() => {});
            jest.useFakeTimers();
            service.handleVirtualPlayerCombat(session, server);
            jest.advanceTimersByTime(CONSTANTS.MS_TO_SECONDS_CONVERSION); // Simulate the delay
            expect(service.combatMove).toHaveBeenCalledWith(session, server, 'run');
            jest.useRealTimers();
        });

        it('should call combatMove with "attack" if the virtual player is not injured', () => {
            session.combat = {
                attacker: {
                    player: { isVirtual: true, isAgressive: false, attributes: { currentHP: 10, lifePoints: 10 } },
                } as Combatant,
                defender: { player: {} as Player } as Combatant,
            } as unknown as Combat;
            jest.spyOn(service, 'combatMove').mockImplementation(() => {});
            jest.useFakeTimers();
            service.handleVirtualPlayerCombat(session, server);
            jest.advanceTimersByTime(CONSTANTS.COMBAT_TURN_DELAY); // Simulate the delay
            expect(service.combatMove).toHaveBeenCalledWith(session, server, 'attack');
            jest.useRealTimers();
        });

        it('should respect delay before executing the move', () => {
            session.combat = {
                attacker: {
                    player: { isVirtual: true, isAgressive: false, attributes: { currentHP: 5, lifePoints: 10 } },
                } as Combatant,
                defender: { player: {} as Player } as Combatant,
            } as unknown as Combat;
            jest.spyOn(service, 'combatMove').mockImplementation(() => {});
            jest.useFakeTimers();
            service.handleVirtualPlayerCombat(session, server);
            jest.advanceTimersByTime(CONSTANTS.COMBAT_TURN_DELAY - 1); // Move timer forward but not enough
            expect(service.combatMove).toHaveBeenCalled();
            jest.advanceTimersByTime(1); // Complete the timer
            expect(service.combatMove).toHaveBeenCalledWith(session, server, 'run');
            jest.useRealTimers();
        });
    });
    describe('respawnPlayer', () => {
        it('should return if player start position is undefined', () => {
            const player = { startPosition: undefined } as Player;
            const map: Map = {
                _tiles: [
                    [{ player: null } as Tile, { player: null } as Tile],
                    [{ player: null } as Tile, { player: null } as Tile],
                ],
                _size: 10,
                _items: [],
                mode: ModeEnum.BR,
            };
            const server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            service.respawnPlayer(player, map, 'room123', server);

            expect(server.to).not.toHaveBeenCalled();
        });

        it('should return if player is already at the start position', () => {
            const player = {
                startPosition: { x: 0, y: 0 },
                position: { x: 0, y: 0 },
            } as Player;
            const map: Map = {
                _tiles: [
                    [{ player: null } as Tile, { player: null } as Tile],
                    [{ player: null } as Tile, { player: null } as Tile],
                ],
                _size: 10,
                _items: [],
                mode: ModeEnum.BR,
            };
            const server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            service.respawnPlayer(player, map, 'room123', server);

            expect(server.to).not.toHaveBeenCalled();
        });

        it('should call findRespawnPosition', () => {
            const player = {
                startPosition: { x: 0, y: 0 },
                position: { x: 1, y: 1 },
            } as Player;
            const map: Map = {
                _tiles: [
                    [{ player: null } as Tile, { player: null } as Tile],
                    [{ player: null } as Tile, { player: null } as Tile],
                ],
                _size: 10,
                _items: [],
                mode: ModeEnum.BR,
            };
            const server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            jest.spyOn(service, 'findRespawnPosition').mockImplementation(() => {});
            service.respawnPlayer(player, map, 'room123', server);

            expect(service.findRespawnPosition).toHaveBeenCalled();
        });

        it('should set the player position to the new position', () => {
            const player = {
                startPosition: { x: 0, y: 0 },
                position: { x: 1, y: 1 },
                socketId: 'player123',
            } as Player;
            const map: Map = {
                _tiles: [
                    [{ player: null } as Tile, { player: null } as Tile],
                    [{ player: null } as Tile, { player: null } as Tile],
                ],
                _size: 10,
                _items: [],
                mode: ModeEnum.BR,
            };
            const server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            service.respawnPlayer(player, map, 'room123', server);
        });

        it('should emit map and player position updates to the server', () => {
            const player = {
                startPosition: { x: 0, y: 0 },
                position: { x: 1, y: 1 },
                socketId: 'player123',
            } as Player;
            const map: Map = {
                _tiles: [
                    [{ player: null } as Tile, { player: null } as Tile],
                    [{ player: null } as Tile, { player: null } as Tile],
                ],
                _size: 10,
                _items: [],
                mode: ModeEnum.BR,
            };
            const server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as Server;

            service.respawnPlayer(player, map, 'room123', server);

            expect(server.to).toHaveBeenCalledWith('room123');
            expect(server.emit).toHaveBeenCalledWith(GameLogicEvents.UpdateMap, map);
            expect(server.to).toHaveBeenCalledWith(player.socketId);
            expect(server.emit).toHaveBeenCalledWith(GameLogicEvents.UpdatePlayerPos, player.position);
        });
    });
    describe('playerWon', () => {
        it('should emit CombatResult and send log to all players', () => {
            const combat: Combat = {
                attacker: { player: { socketId: 'player123', userName: 'Victor', nbWins: 0 } as Player },
                defender: { player: { socketId: 'player456' } as Player },
            } as Combat;

            session.combat = combat;
            session.room.players = [{ socketId: 'player456' } as Player];
            session.room.map = {
                _tiles: [[{ player: null } as Tile]],
                _size: 10,
                _items: [],
                mode: ModeEnum.BR,
            } as Map;

            jest.spyOn(service, 'respawnPlayer').mockImplementation(() => {});
            jest.spyOn(turnService, 'endTurn').mockImplementation(() => {});
            jest.spyOn(turnService, 'continueTurn').mockImplementation(() => {});
            jest.spyOn(turnService, 'startNextTurn').mockImplementation(() => {});
            jest.spyOn(turnService, 'stopGame').mockImplementation(() => {});

            combat.attacker.player.nbWins = CONSTANTS.CLASSIC_MAX_WINS - 1;

            (service as any).playerWon(session, combat, server);

            expect(server.to).toHaveBeenCalledWith(session.room.code);
            expect(server.emit).toHaveBeenCalledWith(CombatEvents.CombatResult, combat.attacker.player);
            expect(infoService.createLog).toHaveBeenCalledWith(
                `${combat.attacker.player.userName} a gagné le combat.`,
                [combat.attacker.player.socketId],
                session.room.code,
            );
            expect(infoService.sendToAllPlayers).not.toHaveBeenCalledWith(server, expect.any(String), session.room.code);
        });

        it('should stop the game if the player reaches max wins', () => {
            const combat: Combat = {
                attacker: { player: { socketId: 'player123', userName: 'Victor', nbWins: CONSTANTS.CLASSIC_MAX_WINS } as Player },
                defender: { player: { socketId: 'player456' } as Player },
            } as Combat;

            session.combat = combat;
            session.room.map = {
                _tiles: [[{ player: null } as Tile]],
                _size: 10,
                _items: [],
                mode: ModeEnum.BR,
            } as Map;

            jest.spyOn(turnService, 'stopGame').mockImplementation(() => {});

            (service as any).playerWon(session, combat, server);

            expect(turnService.stopGame).toHaveBeenCalledWith(session, server, combat.attacker.player);
        });

        it('should respawn the defender and continue or start the next turn', () => {
            const combat: Combat = {
                attacker: { player: { socketId: 'player123', userName: 'Victor', nbWins: 0 } as Player },
                defender: { player: { socketId: 'player456', isVirtual: false } as Player },
            } as Combat;

            session.combat = combat;
            session.room.players = [{ socketId: 'player123', isVirtual: false } as Player, { socketId: 'player456', isVirtual: false } as Player];
            session.turnIndex = 0;
            session.room.map = {
                _tiles: [[{ player: null } as Tile]],
                _size: 10,
                _items: [],
                mode: ModeEnum.BR,
            } as Map;

            jest.spyOn(service, 'respawnPlayer').mockImplementation(() => {});
            jest.spyOn(turnService, 'continueTurn').mockImplementation(() => {});
            jest.spyOn(turnService, 'startNextTurn').mockImplementation(() => {});

            (service as any).playerWon(session, combat, server);

            expect(service.respawnPlayer).not.toHaveBeenCalledWith(combat.defender.player, session.room.map, session.room.code, server);

            if (combat.attacker.player === session.room.players[session.turnIndex]) {
                expect(turnService.continueTurn).toHaveBeenCalledWith(session, server);
            } else {
                expect(turnService.startNextTurn).not.toHaveBeenCalledWith(session, server);
            }
        });
    });
});
