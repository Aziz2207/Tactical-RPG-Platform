import { TestBed } from '@angular/core/testing';
import { CombatService, DiceRollingObject } from '@app/services/combat/combat.service';
import { GameService } from '@app/services/game/game.service';
import { SocketService } from '@app/services/socket/socket.service';
import { CONSTANTS } from '@common/constants';
import { Combat, CombatMove } from '@common/interfaces/combat';
import { Player } from '@common/interfaces/player';
import { ItemEnum } from '@common/item-enum';

describe('CombatService', () => {
    let service: CombatService;
    let socketService: jasmine.SpyObj<SocketService>;
    let gameService: jasmine.SpyObj<GameService>;

    const mockCombat: Combat = {
        attacker: {
            player: {
                socketId: 'attackerId',
                attributes: {
                    offensePoints: 2,
                    diceChoice: 'attack',
                    speedPoints: 0,
                    currentSpeed: 0,
                    lifePoints: 0,
                    currentHP: 0,
                    defensePoints: 0,
                    actionLeft: 0,
                },
                userName: '',
                characterType: '',
                isHost: false,
                nbWins: 0,
            } as unknown as Player,
            runAttempts: 1,
            onIce: false,
        },
        defender: {
            player: {
                socketId: 'defenderId',
                attributes: {
                    defensePoints: 3,
                    diceChoice: 'defense',
                    speedPoints: 0,
                    currentSpeed: 0,
                    lifePoints: 0,
                    currentHP: 0,
                    offensePoints: 0,
                    actionLeft: 0,
                },
                userName: '',
                characterType: '',
                isHost: false,
                nbWins: 0,
            } as unknown as Player,
            runAttempts: 0,
            onIce: false,
        },
        attackResult: {
            attackRoll: 10,
            defenseRoll: 8,
            success: true,
        },
        locked: false,
    };

    beforeEach(() => {
        const socketSpy = jasmine.createSpyObj('SocketService', ['send', 'on', 'off', 'isSocketAlive', 'getId']);
        const gameSpy = jasmine.createSpyObj('GameService', ['isMyTurn']);

        TestBed.configureTestingModule({
            providers: [CombatService, { provide: SocketService, useValue: socketSpy }, { provide: GameService, useValue: gameSpy }],
        });

        service = TestBed.inject(CombatService);
        socketService = TestBed.inject(SocketService) as jasmine.SpyObj<SocketService>;
        gameService = TestBed.inject(GameService) as jasmine.SpyObj<GameService>;

        socketService.isSocketAlive.and.returnValue(true);
        socketService.getId.and.returnValue('myId');
        gameService.isMyTurn.and.returnValue(true);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('startCombat', () => {
        it("should send startCombat event when it is player's turn", () => {
            service.startCombat('targetUser');
            expect(socketService.send).toHaveBeenCalledWith('startCombat', 'targetUser');
        });

        it("should not send startCombat event when it is not player's turn", () => {
            gameService.isMyTurn.and.returnValue(false);
            service.startCombat('targetUser');
            expect(socketService.send).not.toHaveBeenCalled();
        });
    });

    describe('combatMove', () => {
        it('should send combatMove if attacker is the player', () => {
            service.combat = mockCombat;
            socketService.getId.and.returnValue('attackerId');
            service.combatMove({ moveType: 'attack' } as unknown as CombatMove);
            expect(socketService.send).toHaveBeenCalledWith('combatMove', { moveType: 'attack' });
        });

        it('should not send combatMove if attacker is not the player', () => {
            socketService.getId.and.returnValue('otherId');
            service.combat = mockCombat;
            service.combatMove({ moveType: 'attack' } as unknown as CombatMove);
            expect(socketService.send).not.toHaveBeenCalled();
        });
    });

    describe('handleAttack', () => {
        it('should initialize dice rolls for attack and defense', () => {
            service.handleAttack(mockCombat);
            expect(service.attackRollObject?.currentRoll).toBeGreaterThanOrEqual(1);
            expect(service.defenseRollObject?.currentRoll).toBeGreaterThanOrEqual(1);
        });
    });

    describe('isInCombat', () => {
        it('should return true if player is attacker or defender', () => {
            service.combat = mockCombat;
            expect(service.isInCombat('attackerId')).toBeTrue();
            expect(service.isInCombat('defenderId')).toBeTrue();
        });

        it('should return false if player is not involved in combat', () => {
            service.combat = mockCombat;
            expect(service.isInCombat('otherId')).toBeFalse();
        });
    });

    describe('enableListeners', () => {
        it('should set combat data on startCombat event', () => {
            socketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'startCombat') callback(mockCombat as unknown as T);
            });
            service.enableListeners();
            expect(service.combat).toEqual(mockCombat);
            expect(service.player1).toEqual(mockCombat.attacker.player);
            expect(service.player2).toEqual(mockCombat.defender.player);
        });

        it('should handle attack result on attackResult event', () => {
            socketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'attackResult') callback(mockCombat as unknown as T);
            });
            service.enableListeners();
            expect(service.combat).toEqual(mockCombat);
            expect(service.currentlyAttacking).toBeFalse();
            expect(service.currentlyDefending).toBeFalse();
        });
    });

    describe('diceRoller', () => {
        it('should perform dice rolls and finalize roll object', (done) => {
            const rollObj: DiceRollingObject = { currentRoll: 0, finalRoll: 5, isDone: false };
            service.diceRoller(CONSTANTS.DICE_6, 5, rollObj);
            setTimeout(() => {
                expect(rollObj.currentRoll).toBe(rollObj.finalRoll);
                expect(rollObj.isDone).toBeTrue();
                done();
            }, CONSTANTS.MS_TO_SECONDS_CONVERSION);
        });
    });

    describe('reset', () => {
        it('should reset combat-related properties', () => {
            service.combat = mockCombat;
            service.currentlyAttacking = true;
            service.currentlyDefending = true;
            service.player1 = mockCombat.attacker.player;
            service.player2 = mockCombat.defender.player;
            service.attackRollObject = { currentRoll: 0, finalRoll: 0, isDone: true };
            service.defenseRollObject = { currentRoll: 0, finalRoll: 0, isDone: true };

            service.reset();

            expect(service.combat).toBeUndefined();
            expect(service.currentlyAttacking).toBeFalse();
            expect(service.currentlyDefending).toBeFalse();
            expect(service.player1).toBeUndefined();
            expect(service.player2).toBeUndefined();
            expect(service.attackRollObject).toBeUndefined();
            expect(service.defenseRollObject).toBeUndefined();
        });
    });

    describe('combatClock event', () => {
        it('should update combat timer on combatClock event', () => {
            const timerValue = 30;
            socketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'combatClock') callback(timerValue as unknown as T);
            });
            service.enableListeners();
            expect(service.combatTimer).toBe(timerValue);
        });
    });

    describe('runFailed event', () => {
        it('should reset attack and defense states on runFailed', () => {
            service.currentlyAttacking = true;
            service.currentlyDefending = true;
            socketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'runFailed') callback(mockCombat as unknown as T);
            });

            service.enableListeners();

            expect(service.currentlyAttacking).toBeFalse();
            expect(service.currentlyDefending).toBeFalse();
        });
    });

    describe('combatAborted event', () => {
        it('should reset combat-related properties on combatAborted event', () => {
            service.combat = mockCombat;
            socketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'combatAborted') callback(mockCombat as unknown as T);
            });

            spyOn(service, 'reset');
            service.enableListeners();

            expect(service.reset).toHaveBeenCalled();
        });
    });

    describe('nextCombatTurn event', () => {
        it('should update combat state and reset roll objects', () => {
            const newCombat = { ...mockCombat, defender: { ...mockCombat.attacker } };

            service.player1 = mockCombat.attacker.player;
            service.player2 = mockCombat.defender.player;
            service.attackRollObject = { currentRoll: 0, finalRoll: 10, isDone: true };
            service.defenseRollObject = { currentRoll: 0, finalRoll: 10, isDone: true };

            socketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'nextCombatTurn') callback(newCombat as unknown as T);
            });

            service.enableListeners();

            expect(service.combat).toEqual(newCombat);
            expect(service.player1).toEqual(newCombat.attacker.player);
            expect(service.player2).toEqual(newCombat.defender.player);
            expect(service.attackRollObject).toBeUndefined();
            expect(service.defenseRollObject).toBeUndefined();
        });
    });

    describe('continueTurn event', () => {
        it('should call reset on continueTurn event', () => {
            spyOn(service, 'reset');
            socketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'continueTurn') callback(mockCombat as unknown as T);
            });
            service.enableListeners();
            expect(service.reset).toHaveBeenCalled();
        });
    });

    describe('combatResult event', () => {
        it('should call handleAttack when combat data is provided', () => {
            const combatData = { ...mockCombat };
            spyOn(service, 'handleAttack');

            socketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'combatResult') callback(combatData as unknown as T);
            });

            service.enableListeners();
            expect(service.handleAttack).toHaveBeenCalledWith(combatData);
        });

        it('should set escaped to true when no combat data is provided', () => {
            socketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'combatResult') callback(undefined as unknown as T);
            });

            service.enableListeners();
            expect(service.escaped).toBeTrue();
        });
    });

    describe('yourAttack event', () => {
        it('should set currentlyAttacking to true and currentlyDefending to false on yourAttack event', () => {
            socketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
                if (event === 'yourAttack') callback(undefined as unknown as T);
            });

            service.enableListeners();

            expect(service.currentlyAttacking).toBeTrue();
            expect(service.currentlyDefending).toBeFalse();
        });
    });

    describe('updateCanRun', () => {
        let mockPlayer: Player = mockCombat.attacker.player;
        const mockChipItem = { id: 1, itemType: ItemEnum.Chip, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false };

        it('should set canRun to false if runAttempts exceeds MAX_RUNS and no chip is present', () => {
            let playerParams = { onIce: false, canRun: true };
            mockCombat.attacker.runAttempts = CONSTANTS.MAX_RUNS;
            mockPlayer.inventory = [];
            service.updateCanRun(mockCombat.attacker.player, playerParams, mockCombat);

            expect(playerParams.canRun).toBeFalse();
        });

        it('should set canRun to false if runAttempts exceeds MAX_RUNS_CHIP and chip is present', () => {
            let playerParams = { onIce: false, canRun: true };

            mockCombat.attacker.runAttempts = CONSTANTS.MAX_RUNS_CHIP;
            mockPlayer.inventory = [mockChipItem];
            service.updateCanRun(mockPlayer, playerParams, mockCombat);

            expect(playerParams.canRun).toBeFalse();
        });

        it('should not change canRun if runAttempts are within allowed limits', () => {
            let playerParams = { onIce: false, canRun: true };

            mockCombat.attacker.runAttempts = CONSTANTS.MAX_RUNS - 1;
            mockCombat.attacker.player.inventory = []; // Empty inventory
            service.updateCanRun(mockCombat.attacker.player, playerParams, mockCombat);
            expect(playerParams.canRun).toBeTrue();
        });

        it('should not change canRun if chip is present and runAttempts are within MAX_RUNS_CHIP', () => {
            let playerParams = { onIce: false, canRun: true };
            mockCombat.attacker.runAttempts = CONSTANTS.MAX_RUNS_CHIP - 1;
            mockPlayer.inventory = [mockChipItem];
            service.updateCanRun(mockPlayer, playerParams, mockCombat);
            expect(playerParams.canRun).toBeTrue();
        });
    });
});
