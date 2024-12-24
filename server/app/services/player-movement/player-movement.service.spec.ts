import { ActiveSession } from '@app/interfaces/active-session';
import { GameTimer } from '@app/interfaces/game-timer';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { TileValidityService } from '@app/services/tile-validity/tile-validity.service';
import { CONSTANTS } from '@common/constants';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { Item } from '@common/interfaces/item';
import { Player } from '@common/interfaces/player';
import { ItemEnum } from '@common/item-enum';
import { TileEnum } from '@common/tile-enum';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { ActionsService } from '../actions/actions.service';
import { GameInfoService } from '../game-info/game-info.service';
import { TurnService } from '../turn/turn.service';
import { PlayerMovementService } from './player-movement.service';


describe('PlayerMovementService', () => {
    let service: PlayerMovementService;
    let server: jest.Mocked<Server>;
    let gameTimerService: jest.Mocked<GameTimerService>;
    let turnService: jest.Mocked<TurnService>;
    let gameLogService: jest.Mocked<GameInfoService>;
    let actionsService: jest.Mocked<ActionsService>;
    let mockPath: [number, number][];
    let tileValidityService: jest.Mocked<TileValidityService>;
    let mockSession: ActiveSession;
    let infoService: jest.Mocked<GameInfoService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlayerMovementService,
                {
                    provide: GameTimerService,
                    useValue: {
                        createTimer: jest.fn(),
                        startTimer: jest.fn(),
                        stopTimer: jest.fn(),
                    },
                },
                {
                    provide: TileValidityService,
                    useValue: {
                        getReachableTiles: jest.fn().mockReturnValue([]),
                        isValidTile: jest.fn(),
                        countValidTiles: jest.fn(),
                    },
                },
                {
                    provide: TurnService,
                    useValue: {
                        endTurn: jest.fn(),
                        startNextTurn: jest.fn(),
                        stopGame: jest.fn(),
                    },
                },
                {
                    provide: ActionsService,
                    useValue: {
                        handleVirtualPlayerInventory: jest.fn(),
                        hasPicItem: jest.fn(),
                        playerCanDoAction: jest.fn(),
                        canStillActCheck: jest.fn(),
                    },
                },
                {
                    provide: GameInfoService,
                    useValue: {
                        addVisitedTile: jest.fn(),
                        calculatePlayerTiles: jest.fn(),
                        calculateGlobalTiles: jest.fn(),
                        createCombatTurnLog: jest.fn(),
                        beginCombatLog: jest.fn(),
                    },
                }
            ],
        }).compile();

        service = module.get<PlayerMovementService>(PlayerMovementService);
        gameTimerService = module.get(GameTimerService) as jest.Mocked<GameTimerService>;
        turnService = module.get(TurnService) as jest.Mocked<TurnService>;
        actionsService = module.get(ActionsService) as jest.Mocked<ActionsService>;
        tileValidityService = module.get(TileValidityService) as jest.Mocked<TileValidityService>;

        server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        mockPath = [
            [1, 1],
            [2, 2],
        ];

        mockSession = {
            movementUnlocked: true,
            room: {
                code: 'room1',
                players: [
                    {
                        socketId: 'socket1',
                        position: { x: 0, y: 0 },
                        attributes: { currentSpeed: 5 },
                    },
                ],
                map: {
                    _tiles: Array(3)
                        .fill(null)
                        .map(() =>
                            Array(3)
                                .fill(null)
                                .map(() => ({
                                    _tileType: TileEnum.Grass,
                                    player: undefined,
                                })),
                        ),
                },
            },
        } as unknown as ActiveSession;

        gameTimerService.createTimer.mockReturnValue({
            count: 0,
            tickSpeed: CONSTANTS.MOVEMENT_DURATION,
            increment: true,
        } as GameTimer);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('movePlayer', () => {
        let mockSession: ActiveSession;
        let mockPath: [number, number][];
        let server: jest.Mocked<Server>;
        let currentPlayer: Player;
    
        beforeEach(() => {
            server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as jest.Mocked<Server>;
    
            mockPath = [
                [0, 0],
                [0, 1],
            ];
    
            currentPlayer = {
                socketId: 'socket1',
                position: { x: 1, y: 0 },
                startPosition: { x: 0, y: 0 },
                attributes: { currentSpeed: 5 },
                inventory: [],
            } as Player;
    
            mockSession = {
                movementUnlocked: true,
                room: {
                    code: 'room1',
                    players: [currentPlayer],
                    map: {
                        _tiles: 
                        [
                            [{_tileType: 'grass'}, {_tileType: 'grass'}],
                            [{_tileType: 'grass'}, {_tileType: 'grass'}],
                        ],
                    },
                },
            } as unknown as ActiveSession;
        });
    
        it('should not proceed if movement is locked', async () => {
            mockSession.movementUnlocked = false;
    
            await service.movePlayer('socket1', mockSession, mockPath, server);
    
            expect(server.emit).not.toHaveBeenCalled();
        });
    
        it('should not proceed if the path is empty', async () => {
            await service.movePlayer('socket1', mockSession, [], server);
    
            expect(server.emit).not.toHaveBeenCalled();
        });
    
        it('should move the player along the path', async () => {
            await service.movePlayer('socket1', mockSession, mockPath, server);
    
            expect(currentPlayer.position).toEqual({ x: 0, y: 1 });
        });
    
        it('should handle flag on start point and stop the game', async () => {
            jest.spyOn(service, 'isFlagOnStartPoint').mockReturnValue(true);
            jest.spyOn(turnService, 'stopGame');
    
            await service.movePlayer('socket1', mockSession, mockPath, server);
    
            expect(turnService.stopGame).toHaveBeenCalledWith(mockSession, server, currentPlayer);
        });
    
        it('should handle item interaction and stop further movement', async () => {
            const mockItem: Item = { itemType: ItemEnum.Battery } as Item;
            mockSession.room.map._tiles[1][1].item = mockItem;
    
            jest.spyOn(service, 'handleInventory');
            jest.spyOn(service as any, 'isValidItem').mockReturnValue(true);
            await service.movePlayer('socket1', mockSession, mockPath, server);
    
            expect(service.handleInventory).toHaveBeenCalled();
        });
    
        it('should wait between movements', async () => {
            jest.spyOn(service, 'wait150Ms');
            await service.movePlayer('socket1', mockSession, mockPath, server);
            expect(service.wait150Ms).toHaveBeenCalledTimes(mockPath.length);
        });
    
        it('should re-lock movement after completing the path', async () => {
            await service.movePlayer('socket1', mockSession, mockPath, server);
    
            expect(mockSession.movementUnlocked).toBe(true);
        });
    
        it('should check if the player can still act if not virtual', async () => {
            jest.spyOn(actionsService, 'canStillActCheck');
    
            await service.movePlayer('socket1', mockSession, mockPath, server);
    
            expect(actionsService.canStillActCheck).toHaveBeenCalledWith(
                currentPlayer,
                mockSession.room.map,
                mockSession,
                server
            );
        });
    
        it('should not call `canStillActCheck` if the player is virtual', async () => {
            jest.spyOn(actionsService, 'canStillActCheck');
            mockSession.room.players[0].isVirtual = true;
    
            await service.movePlayer('socket1', mockSession, mockPath, server);
    
            expect(actionsService.canStillActCheck).not.toHaveBeenCalled();
        });

        it('should call endTurn if slipped on ice', async () => {
            jest.spyOn(service as any, 'checkIfSlippedIce').mockReturnValue(true);
            const endTurnSpy = jest.spyOn(turnService, 'endTurn');
            await service.movePlayer('socket1', mockSession, mockPath, server);
            expect(endTurnSpy).toHaveBeenCalled();
        })
    });
    

    describe('teleportPlayer', () => {
        it('should correctly update player position and map', () => {
            const mockPlayer = {
                position: { x: 0, y: 0 },
            } as Player;

            const newPosition = { x: 1, y: 1 };

            service.teleportPlayer(mockPlayer, mockSession.room.map, newPosition);

            expect(mockSession.room.map._tiles[0][0].player).toBeUndefined();
            expect(mockSession.room.map._tiles[1][1].player).toBe(mockPlayer);
            expect(mockPlayer.position).toEqual(newPosition);
        });
    });

    describe('handleInventory', () => {
        it('should add item to inventory for a virtual player', () => {
            const mockItem: Item = {
                itemType: ItemEnum.Battery,
            } as Item;

            const mockPlayer: Player = {
                isVirtual: true,
                inventory: [],
            } as Player;

            service.handleInventory(mockItem, server, { x: 0, y: 0 }, mockSession, mockPlayer);

            expect(actionsService.handleVirtualPlayerInventory).toHaveBeenCalledWith(mockPlayer, mockItem, mockSession, server);
        });

        it('should emit inventory update for normal players', () => {
            const mockItem: Item = {
                itemType: ItemEnum.Battery,
            } as Item;

            const mockPlayer: Player = {
                isVirtual: false,
            } as Player;

            service.handleInventory(mockItem, server, { x: 0, y: 0 }, mockSession, mockPlayer);

            expect(server.to).toHaveBeenCalledWith(mockSession.room.code);
        });
    });

    describe('shuffleArray', () => {
        it('should shuffle array correctly', () => {
            const array = [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            const shuffled = service.shuffleArray([...array]);

            expect(shuffled.length).toBe(array.length);
        });
    });

    describe('loadCharacters', () => {
        let server: jest.Mocked<Server>;
        let mockSession: ActiveSession;
    
        beforeEach(() => {
            server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as jest.Mocked<Server>;
    
            mockSession = {
                room: {
                    code: 'room1',
                    players: [
                        { socketId: 'player1', startPosition: null, position: null } as Player,
                        { socketId: 'player2', startPosition: null, position: null } as Player,
                    ],
                    map: {
                        _tiles: 
                        [
                            [{_tileType: 'grass'}, {_tileType: 'grass'}],
                            [{_tileType: 'grass'}, {_tileType: 'grass'}],
                        ],
                    },
                },
            } as unknown as ActiveSession;
    
            // Add start items to mock map
            mockSession.room.map._tiles[0][0].item = { itemType: 'start' } as Item;
            mockSession.room.map._tiles[1][1].item = { itemType: 'start' } as Item;
            mockSession.room.map._tiles[1][0].item = { itemType: 'start' } as Item;
        });
    
        it('should assign shuffled starting points to players', () => {
            jest.spyOn(service, 'shuffleArray').mockImplementation((array) => array.reverse());
    
            service.loadCharacters(server, mockSession);
    
            expect(mockSession.room.players[0].startPosition).toBeDefined();
            expect(mockSession.room.players[1].startPosition).toBeDefined();
            
        });
    
        it('should emit the updated map to the server', () => {
            service.loadCharacters(server, mockSession);
    
            expect(server.to).toHaveBeenCalledWith('room1');
            expect(server.emit).toHaveBeenCalledWith(GameLogicEvents.UpdateMap, mockSession.room.map);
        });
    
        it('should shuffle starting points before assigning', () => {
            const shuffleSpy = jest.spyOn(service, 'shuffleArray');
    
            service.loadCharacters(server, mockSession);
    
            expect(shuffleSpy).toHaveBeenCalledWith(expect.any(Array));
        });
    });

    describe('teleportPlayerDebug', () => {
        let server: jest.Mocked<Server>;
        let mockSession: ActiveSession;
        let currentPlayer: Player;
    
        beforeEach(() => {
            server = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            } as unknown as jest.Mocked<Server>;
    
            currentPlayer = {
                socketId: 'player1',
                position: { x: 0, y: 0 },
                startPosition: { x: 0, y: 0 },
                attributes: { currentSpeed: 5 },
                inventory: [],
            } as Player;
    
            mockSession = {
                movementUnlocked: false,
                room: {
                    code: 'room1',
                    players: [currentPlayer],
                    map: {
                        _tiles: [
                            [{ _tileType: 'grass' }, { _tileType: 'grass' }],
                            [{ _tileType: 'grass' }, { _tileType: 'grass' }],
                        ],
                    },
                },
                debugMode: true,
            } as unknown as ActiveSession;
    
            mockSession.room.map._tiles[0][0].player = currentPlayer;
        });
    
        it('should teleport the player to the specified position', () => {
            const newPosition = { x: 1, y: 1 };
    
            jest.spyOn(service, 'teleportPlayer');
            jest.spyOn(tileValidityService, 'isValidTile').mockReturnValue(true);
            service.teleportPlayerDebug('player1', mockSession, newPosition, server);
    
            expect(service.teleportPlayer).toHaveBeenCalledWith(currentPlayer, mockSession.room.map, newPosition);
            expect(mockSession.room.map._tiles[1][1].player).toBe(currentPlayer);
            expect(mockSession.room.map._tiles[0][0].player).toBeUndefined();
        });
    
        it('should stop the game if the player is on the flag and the start point', () => {
            const newPosition = { x: 0, y: 0 };
            jest.spyOn(service, 'isFlagOnStartPoint').mockReturnValue(true);
            jest.spyOn(turnService, 'stopGame');
            jest.spyOn(tileValidityService, 'isValidTile').mockReturnValue(true);
    
            service.teleportPlayerDebug('player1', mockSession, newPosition, server);
    
            expect(turnService.stopGame).toHaveBeenCalledWith(mockSession, server, currentPlayer);
        });
    
        it('should emit server updates for the player and map', () => {
            jest.spyOn(service as any, 'serverEmissions');
            jest.spyOn(tileValidityService, 'isValidTile').mockReturnValue(true);

            service.teleportPlayerDebug('player1', mockSession, { x: 1, y: 1 }, server);
    
            expect(service['serverEmissions']).toHaveBeenCalledWith(server, mockSession, currentPlayer);
        });
    
        it('should handle inventory if a valid item is present at the new position', () => {
            const mockItem = { itemType: ItemEnum.Battery } as unknown as Item;
            const newPosition = { x: 1, y: 1 };
            jest.spyOn(tileValidityService, 'isValidTile').mockReturnValue(true);

            mockSession.room.map._tiles[1][1].item = mockItem;
    
            jest.spyOn(service as any, 'isValidItem').mockReturnValue(true);
            jest.spyOn(service, 'handleInventory');
    
            service.teleportPlayerDebug('player1', mockSession, newPosition, server);
    
            expect(service.handleInventory).toHaveBeenCalledWith(
                mockItem,
                server,
                newPosition,
                mockSession,
                currentPlayer
            );
            expect(mockSession.movementUnlocked).toBe(true);
        });
    
        it('should not unlock movement if there is no valid item', () => {
            const newPosition = { x: 1, y: 1 };
    
            jest.spyOn(service as any, 'isValidItem').mockReturnValue(false);
    
            service.teleportPlayerDebug('player1', mockSession, newPosition, server);
    
            expect(mockSession.movementUnlocked).toBe(false);
        });
    
        it('should do nothing if the player is not found', () => {
            jest.spyOn(service, 'teleportPlayer');
    
            service.teleportPlayerDebug('nonexistentPlayer', mockSession, { x: 1, y: 1 }, server);
    
            expect(service.teleportPlayer).not.toHaveBeenCalled();
        });
    });
    
});
