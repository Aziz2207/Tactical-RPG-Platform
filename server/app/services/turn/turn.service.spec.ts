import { ActiveSession } from '@app/interfaces/active-session';
import { ActiveSessionService } from '@app/services/active-session/active-session.service';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { TileValidityService } from '@app/services/tile-validity/tile-validity.service';
import { CONSTANTS } from '@common/constants';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { Player } from '@common/interfaces/player';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { TurnService } from './turn.service';

describe('TurnService', () => {
    let turnService: TurnService;
    let gameInfoSerivce: jest.Mocked<GameInfoService>;
    let tileValidityService: jest.Mocked<TileValidityService>;
    let timerService: jest.Mocked<GameTimerService>;
    let activeSessionService: jest.Mocked<ActiveSessionService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;
    let serverMock: { to: jest.Mock };

    beforeEach(async () => {
        jest.useFakeTimers();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TurnService,
                {
                    provide: GameInfoService,
                    useValue: {
                        createLog: jest.fn(),
                        sendToAllPlayers: jest.fn(),
                        playerLeftLog: jest.fn(),
                        handleGameEnd: jest.fn(),
                        nextTurnLog: jest.fn(),
                    },
                },
                { provide: TileValidityService, useValue: { getReachableTiles: jest.fn() } },
                { provide: GameTimerService, useValue: { startTimer: jest.fn(), stopTimer: jest.fn() } },
                { provide: ActiveSessionService, useValue: { endSession: jest.fn() } },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile();

        turnService = module.get<TurnService>(TurnService);
        gameInfoSerivce = module.get(GameInfoService);
        tileValidityService = module.get(TileValidityService);
        timerService = module.get(GameTimerService);
        activeSessionService = module.get(ActiveSessionService);
        eventEmitter = module.get(EventEmitter2);

        serverMock = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('startNextTurn', () => {
        it('should not start the turn if the room is not active', () => {
            const mockSession = {
                room: { isActive: false, players: [], code: 'room123' },
                timer: { interval: null },
            } as unknown as ActiveSession;

            turnService.startNextTurn(mockSession, serverMock as any);

            expect(serverMock.to).not.toHaveBeenCalled();
            expect(mockSession.turnIndex).toBeUndefined();
        });

        it('should not start the turn if the timer is already active', () => {
            const mockSession = {
                room: { isActive: true, players: [], code: 'room123' },
                timer: { interval: {} }, // Timer is already active
            } as unknown as ActiveSession;

            turnService.startNextTurn(mockSession, serverMock as any);

            expect(serverMock.to).not.toHaveBeenCalled();
            expect(mockSession.turnIndex).toBeUndefined();
        });

        it("should set the previous player's hasActed property to false if a turn was active", () => {
            const mockSession = {
                room: {
                    isActive: true,
                    players: [{ hasActed: true, userName: 'Player1', socketId: 'socket1', attributes: { speedPoints: 10 }, isVirtual: false }],
                    code: 'room123',
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
                turnIndex: 0,
                timer: { interval: null },
            } as unknown as ActiveSession;

            turnService.startNextTurn(mockSession, serverMock as any);

            expect(mockSession.room.players[0].hasActed).toBe(false);
        });

        it("should set the current player's speed and emit TurnStarted", () => {
            const mockSession = {
                room: {
                    isActive: true,
                    players: [
                        {
                            hasActed: false,
                            userName: 'Player1',
                            socketId: 'socket1',
                            attributes: { speedPoints: 10, currentSpeed: 0 },
                            isVirtual: false,
                        },
                        {
                            hasActed: false,
                            userName: 'Player2',
                            socketId: 'socket2',
                            attributes: { speedPoints: 15, currentSpeed: 0 },
                            isVirtual: false,
                        },
                    ],
                    code: 'room123',
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
                turnIndex: -1,
                timer: { interval: null },
                turnActive: false,
            } as unknown as ActiveSession;

            turnService.startNextTurn(mockSession, serverMock as any);

            const playerTurn = mockSession.room.players[0];
            expect(playerTurn.attributes.currentSpeed).toBe(10);
            expect(serverMock.to).toHaveBeenCalledWith('room123');
            expect(serverMock.to().emit).toHaveBeenCalledWith(GameLogicEvents.TurnStarted, playerTurn);
        });

        it('should emit a VirtualPlayerTurn event if the player is virtual and stop execution', () => {
            const mockSession = {
                room: {
                    isActive: true,
                    players: [{ userName: 'Player1', socketId: 'socket1', attributes: { speedPoints: 10 }, isVirtual: true }],
                    code: 'room123',
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
                turnIndex: -1,
                timer: { interval: null },
            } as unknown as ActiveSession;

            turnService.startNextTurn(mockSession, serverMock as any);

            expect(eventEmitter.emit).toHaveBeenCalledWith(GameLogicEvents.VirtualPlayerTurn, mockSession, serverMock, mockSession.room.players[0]);
            expect(tileValidityService.getReachableTiles).not.toHaveBeenCalled();
        });

        it('should calculate reachable tiles for the current player and emit them', () => {
            const mockSession = {
                room: {
                    isActive: true,
                    players: [{ userName: 'Player1', socketId: 'socket1', attributes: { speedPoints: 10 }, isVirtual: false }],
                    code: 'room123',
                    map: {},
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
                turnIndex: -1,
                timer: { interval: null },
                debugMode: true,
            } as unknown as ActiveSession;

            tileValidityService.getReachableTiles.mockReturnValue([[0, 0]]);

            turnService.startNextTurn(mockSession, serverMock as any);

            expect(tileValidityService.getReachableTiles).toHaveBeenCalledWith(mockSession.room.map, mockSession.room.players[0]);
        });

        it('should set the timer and start it for the current turn', () => {
            const mockSession = {
                room: {
                    isActive: true,
                    players: [{ userName: 'Player1', socketId: 'socket1', attributes: { speedPoints: 10 }, isVirtual: false }],
                    code: 'room123',
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
                turnIndex: -1,
                timer: { count: 0, interval: null },
            } as unknown as ActiveSession;

            const fakeMethod = jest.fn();
            const fakeMethodReturner = () => fakeMethod;
            turnService['getTurnCounterExpire'] = fakeMethodReturner;
            turnService['getTurnCounterSecond'] = fakeMethodReturner;

            turnService.startNextTurn(mockSession, serverMock as any);

            expect(mockSession.timer.count).toBe(CONSTANTS.ROUND_SECONDS_LENGTH);
            expect(timerService.startTimer).toHaveBeenCalledWith(mockSession.timer, fakeMethod, fakeMethod);
        });
    });

    describe('endTurn', () => {
        it('should stop the timer, emit events, and start the next turn after a delay', () => {
            const mockSession = {
                room: {
                    players: [
                        { userName: 'Player1', socketId: 'socket1' },
                        { userName: 'Player2', socketId: 'socket2' },
                    ],
                    code: 'room123',
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
                turnIndex: 0,
                timer: { count: 10, interval: null },
                turnActive: true,
            };

            jest.spyOn(turnService, 'startNextTurn').mockImplementation(() => {});

            turnService.endTurn(mockSession as any, serverMock as any);

            expect(mockSession.turnActive).toBe(false);
            expect(timerService.stopTimer).toHaveBeenCalledWith(mockSession.timer);
            expect(serverMock.to).toHaveBeenCalledWith('room123');
            expect(serverMock.to().emit).toHaveBeenCalledWith(GameLogicEvents.Clock, 0);

            jest.advanceTimersByTime(3000);
            expect(turnService.startNextTurn).toHaveBeenCalledWith(mockSession, serverMock);
        });
    });

    describe('getNextTurnIndex', () => {
        it('should return 0 if the current turnIndex is the last player in the list', () => {
            const mockSession = {
                turnIndex: 2,
                room: {
                    players: [{}, {}, {}],
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
            } as unknown as ActiveSession;

            const result = turnService.getNextTurnIndex(mockSession);

            expect(result).toBe(0);
        });

        it('should return the next index if the current turnIndex is not the last player', () => {
            const mockSession = {
                turnIndex: 1,
                room: {
                    players: [{}, {}, {}],
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
            } as unknown as ActiveSession;

            const result = turnService.getNextTurnIndex(mockSession);

            expect(result).toBe(2);
        });
    });

    // describe('handlePlayerExit', () => {
    //     it('should end the turn and handle player exit logic', () => {
    //         const mockSession = {
    //             room: {
    //                 players: [
    //                     { userName: 'Player1', socketId: 'socket1', isVirtual: false, position: { x: 0, y: 0 }, isHost: true },
    //                     { userName: 'Player2', socketId: 'socket2', isVirtual: true, position: { x: 1, y: 1 }, isHost: false },
    //                 ],
    //                 code: 'room123',
    //                 map: { _tiles: [[{}, {}], [{}, {}]] },
    //             },
    //             turnIndex: 0,
    //             debugMode: true,
    //             server: {to: () => {emit: jest.fn()}},
    //         } as unknown as ActiveSession;

    //         turnService.handlePlayerExit(mockSession.room.players[0], mockSession as any, serverMock as any);

    //         expect(mockSession.turnIndex).toBe(-1);
    //         expect(timerService.stopTimer).toHaveBeenCalled();
    //         expect(serverMock.to().emit).toHaveBeenCalledWith(GameLogicEvents.ToggleDebugMode, false);
    //         expect(serverMock.to().emit).toHaveBeenCalledWith(GameLogicEvents.UpdateMap, mockSession.room.map);
    //     });
    // });

    describe('stopGame', () => {
        it('should emit GameAborted event if no winner is provided', () => {
            const mockSession = {
                room: {
                    code: 'room123',
                    players: [{ socketId: 'socket1' }, { socketId: 'socket2' }],
                },
                timer: {},
            } as unknown as ActiveSession;

            turnService.stopGame(mockSession, serverMock as any);

            expect(serverMock.to).toHaveBeenCalledWith('room123');
            expect(serverMock.to().emit).toHaveBeenCalledWith(GameLogicEvents.GameAborted);
            expect(timerService.stopTimer).toHaveBeenCalledWith(mockSession.timer);
        });

        it('should emit GameOver event if a winner is provided', () => {
            const mockSession = {
                room: {
                    code: 'room123',
                    players: [
                        { socketId: 'socket1', isVirtual: false },
                        { socketId: 'socket2', isVirtual: false },
                    ],
                    isActive: true,
                },
                timer: {},
            } as unknown as ActiveSession;

            const winner = { userName: 'Player1', socketId: 'socket1' } as unknown as Player;

            turnService.stopGame(mockSession, serverMock as any, winner);

            expect(serverMock.to).toHaveBeenCalledWith('room123');
            expect(serverMock.to().emit).toHaveBeenCalledWith(GameLogicEvents.GameOver, winner);
            expect(timerService.stopTimer).toHaveBeenCalledWith(mockSession.timer);
        });

        it('should stop the timer and end the session', () => {
            const mockSession = {
                room: {
                    code: 'room123',
                    players: [
                        { socketId: 'socket1', isVirtual: true },
                        { socketId: 'socket2', isVirtual: true },
                    ],
                },
                timer: {},
            } as unknown as ActiveSession;

            turnService.stopGame(mockSession, serverMock as any);

            expect(timerService.stopTimer).toHaveBeenCalledWith(mockSession.timer);
            expect(activeSessionService.endSession).toHaveBeenCalledWith(mockSession);
        });
    });

    describe('handlePlayerExit', () => {
        it('should decrement turnIndex and end the turn if the player has the current turn', () => {
            const mockSession = {
                turnIndex: 1,
                room: {
                    code: 'room123',
                    players: [
                        { socketId: 'player1', userName: 'Player1', isVirtual: false, position: { x: 0, y: 0 } },
                        { socketId: 'player2', userName: 'Player2', isVirtual: false, position: { x: 1, y: 1 } },
                    ],
                    map: {
                        _tiles: [
                            [{}, {}],
                            [{}, {}],
                        ],
                    },
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
            } as unknown as ActiveSession;

            const mockPlayer = { socketId: 'player2', userName: 'Player2', position: { x: 1, y: 1 }, isHost: false } as Player;

            jest.spyOn(turnService, 'hasTurn').mockReturnValue(true);
            jest.spyOn(turnService, 'endTurn').mockImplementation(() => {});

            turnService.handlePlayerExit(mockPlayer, mockSession, serverMock as any);

            expect(mockSession.turnIndex).toBe(0);
            expect(turnService.endTurn).toHaveBeenCalledWith(mockSession, serverMock);
        });

        it('should stop the game if the number of real players is less than 1', () => {
            const mockSession = {
                turnIndex: 0,
                room: {
                    code: 'room123',
                    players: [
                        { socketId: 'player1', userName: 'Player1', isVirtual: true, position: { x: 0, y: 0 } },
                        { socketId: 'player2', userName: 'Player2', isVirtual: true, position: { x: 1, y: 1 } },
                    ],
                    map: {
                        _tiles: [
                            [{}, {}],
                            [{}, {}],
                        ],
                    },
                    isActive: true,
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
            } as unknown as ActiveSession;

            const mockPlayer = { socketId: 'player2', userName: 'Player2', position: { x: 1, y: 1 }, isHost: false } as Player;

            jest.spyOn(turnService, 'stopGame').mockImplementation(() => {});

            turnService.handlePlayerExit(mockPlayer, mockSession, serverMock as any);

            expect(turnService.stopGame).toHaveBeenCalledWith(mockSession, serverMock);
        });

        it('should update the map to remove the exiting player', () => {
            const mockSession = {
                turnIndex: 0,
                room: {
                    code: 'room123',
                    players: [
                        { socketId: 'player1', userName: 'Player1', isVirtual: false, position: { x: 0, y: 0 } },
                        { socketId: 'player2', userName: 'Player2', isVirtual: false, position: { x: 1, y: 1 } },
                    ],
                    map: {
                        _tiles: [
                            [{}, {}],
                            [{}, { player: 'player2' }],
                        ],
                    },
                },
                server: {
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn(),
                    }),
                },
            } as unknown as ActiveSession;

            const mockPlayer = { socketId: 'player2', userName: 'Player2', position: { x: 1, y: 1 }, isHost: false } as Player;

            turnService.handlePlayerExit(mockPlayer, mockSession, serverMock as any);

            expect(mockSession.room.map._tiles[1][1].player).toBeUndefined();
        });
    });

    describe('TurnService Private Methods', () => {
        describe('getTurnCounterExpire', () => {
            it('should return a function that calls endTurn with the provided session and server', () => {
                const mockSession = {
                    room: { code: 'room123' },
                } as unknown as ActiveSession;

                jest.spyOn(turnService, 'endTurn').mockImplementation(() => {});

                const expireCallback = turnService['getTurnCounterExpire'](mockSession, serverMock as any);
                expireCallback();

                expect(turnService.endTurn).toHaveBeenCalledWith(mockSession, serverMock);
            });
        });

        describe('getTurnCounterSecond', () => {
            it('should return a function that emits the Clock event with the provided count', () => {
                const mockSession = {
                    room: { code: 'room123' },
                } as unknown as ActiveSession;

                const secondCallback = turnService['getTurnCounterSecond'](mockSession, serverMock as any);
                secondCallback(10);

                expect(serverMock.to).toHaveBeenCalledWith('room123');
                expect(serverMock.to().emit).toHaveBeenCalledWith(GameLogicEvents.Clock, 10);
            });
        });
    });

    describe('pauseTurn', () => {
        it('should stop the timer for the given session', () => {
            const mockSession = {
                timer: { interval: {} },
            } as unknown as ActiveSession;

            turnService.pauseTurn(mockSession);

            expect(timerService.stopTimer).toHaveBeenCalledWith(mockSession.timer);
        });
    });

    describe('continueTurn', () => {
        it('should continue the turn if the timer is active, map exists, and player is valid', () => {
            const mockSession = {
                turnIndex: 0,
                timer: { count: 10, interval: null },
                room: {
                    map: {},
                    players: [{ socketId: 'player1', userName: 'Player1' }],
                    code: 'room123',
                },
                debugMode: false,
            } as unknown as ActiveSession;

            tileValidityService.getReachableTiles.mockReturnValue([[0, 0]]);

            turnService.continueTurn(mockSession, serverMock as any);

            expect(timerService.startTimer).toHaveBeenCalledWith(mockSession.timer, expect.any(Function), expect.any(Function));
            expect(serverMock.to).toHaveBeenCalledWith('player1');
            expect(serverMock.to().emit).toHaveBeenCalledWith(GameLogicEvents.AvailableTiles, [[0, 0]]);
            expect(serverMock.to('room123').emit).toHaveBeenCalledWith(GameLogicEvents.ContinueTurn);
        });

        it('should end the turn if the timer has expired', () => {
            const mockSession = {
                turnIndex: 0,
                timer: { count: 0, interval: null },
                room: {
                    map: {},
                    players: [{ socketId: 'player1', userName: 'Player1' }],
                    code: 'room123',
                },
            } as unknown as ActiveSession;

            jest.spyOn(turnService, 'endTurn').mockImplementation(() => {});

            turnService.continueTurn(mockSession, serverMock as any);

            expect(turnService.endTurn).toHaveBeenCalledWith(mockSession, serverMock);
            expect(timerService.startTimer).not.toHaveBeenCalled();
            expect(serverMock.to).not.toHaveBeenCalledWith('player1');
        });

        it('should end the turn if the map is missing', () => {
            const mockSession = {
                turnIndex: 0,
                timer: { count: 10, interval: null },
                room: {
                    map: null,
                    players: [{ socketId: 'player1', userName: 'Player1' }],
                    code: 'room123',
                },
            } as unknown as ActiveSession;

            jest.spyOn(turnService, 'endTurn').mockImplementation(() => {});

            turnService.continueTurn(mockSession, serverMock as any);

            expect(turnService.endTurn).toHaveBeenCalledWith(mockSession, serverMock);
            expect(timerService.startTimer).not.toHaveBeenCalled();
            expect(serverMock.to).not.toHaveBeenCalledWith('player1');
        });

        it('should end the turn if the player is invalid', () => {
            const mockSession = {
                turnIndex: 1,
                timer: { count: 10, interval: null },
                room: {
                    map: {},
                    players: [{ socketId: 'player1', userName: 'Player1' }],
                    code: 'room123',
                },
            } as unknown as ActiveSession;

            jest.spyOn(turnService, 'endTurn').mockImplementation(() => {});

            turnService.continueTurn(mockSession, serverMock as any);

            expect(turnService.endTurn).toHaveBeenCalledWith(mockSession, serverMock);
            expect(timerService.startTimer).not.toHaveBeenCalled();
            expect(serverMock.to).not.toHaveBeenCalledWith('player1');
        });
    });
});
