import { ActiveSession } from '@app/interfaces/active-session';
import { CombatService } from '@app/services/combat/combat-service.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { TileValidityService } from '@app/services/tile-validity/tile-validity.service';
import { CONSTANTS } from '@common/constants';
import { Player } from '@common/interfaces/player';
import { ItemEnum } from '@common/item-enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { TurnService } from '../turn/turn.service';
import { VirtualPlayerService } from './virtual-player.service';

describe('VirtualPlayerService', () => {
    let service: VirtualPlayerService;
    let playerMovementService: jest.Mocked<PlayerMovementService>;
    let tileValidityService: jest.Mocked<TileValidityService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;
    let turnService: jest.Mocked<TurnService>;
    let combatService: jest.Mocked<CombatService>;

    beforeEach(async () => {
        jest.useFakeTimers();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerService,
                {
                    provide: PlayerMovementService,
                    useValue: {
                        movePlayer: jest.fn().mockResolvedValue(undefined),
                        wait150Ms: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: TileValidityService,
                    useValue: {
                        getReachableTiles: jest.fn(),
                        findPath: jest.fn(),
                        isAdjascent: jest.fn(),
                        getAdjacentTiles: jest.fn(),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: {
                        on: jest.fn(),
                        emit: jest.fn(),
                    },
                },
                {
                    provide: TurnService,
                    useValue: {
                        hasTurn: jest.fn().mockReturnValue(true),
                        endTurn: jest.fn(),
                    },
                },
                {
                    provide: CombatService,
                    useValue: {
                        beginCombat: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<VirtualPlayerService>(VirtualPlayerService);
        playerMovementService = module.get(PlayerMovementService);
        tileValidityService = module.get(TileValidityService);
        eventEmitter = module.get(EventEmitter2);
        turnService = module.get(TurnService);
        combatService = module.get(CombatService);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should create', () => {
        expect(service).toBeDefined();
    });

    describe('generateVirtualPlayer', () => {
        it('should generate a unique virtual player', () => {
            const takenCharacters = ['INFORMATIQUE', 'LOGICIEL'];
            const existingNames = ['MarcTheZionist'];
            const isAgressive = true;

            const result = service.generateVirtualPlayer(takenCharacters, existingNames, isAgressive);

            expect(result).toBeDefined();
            expect(result.isAgressive).toBe(true);
            expect(takenCharacters).not.toContain(result.characterType);
            expect(existingNames).not.toContain(result.userName);
        });
    });

    describe('playTurn', () => {
        it('should attack an adjacent player if reachable', async () => {
            const aggressivePlayer: Player = {
                socketId: 'player1',
                isAgressive: true,
                position: { x: 1, y: 1 },
            } as Player;

            const adjacentPlayer: Player = {
                socketId: 'player2',
                position: { x: 2, y: 2 },
                userName: 'player2',
            } as Player;

            const session: ActiveSession = {
                room: {
                    players: [aggressivePlayer, adjacentPlayer],
                    map: {
                        _tiles: [[{}], [{}]],
                    },
                },
            } as ActiveSession;

            tileValidityService.getReachableTiles.mockReturnValue([[1, 1], [2, 1]]);
            tileValidityService.getAdjacentTiles.mockReturnValue([[2, 1]]);
            tileValidityService.findPath.mockReturnValue([[1, 1], [2, 1]]);

            service.playTurn(session, aggressivePlayer, {} as any);
            jest.advanceTimersByTime(CONSTANTS.VIRTUAL_PLAYER_DURATION_MAX + CONSTANTS.VIRTUAL_PLAYER_DURATION_MIN + 1500);

            expect(playerMovementService.movePlayer).toHaveBeenCalledWith(
                'player1',
                session,
                [[1, 1], [2, 1]],
                expect.anything(),
            );

        });

        it('should move toward an offensive item if reachable', async () => {
            const aggressivePlayer: Player = {
                socketId: 'player1',
                isAgressive: true,
                position: { x: 1, y: 1 },
            } as Player;

            const session: ActiveSession = {
                room: {
                    map: {
                        _tiles: [
                            [{ item: { itemType: ItemEnum.Potion } }, { item: null }],
                            [{}, {}],
                        ],
                    },
                    players: [aggressivePlayer],
                },
            } as ActiveSession;

            tileValidityService.getReachableTiles.mockReturnValue([[1, 1], [0, 0]]);
            tileValidityService.findPath.mockReturnValue([[1, 1], [0, 0]]);

            await service.playTurn(session, aggressivePlayer, {} as any);
            jest.advanceTimersByTime(CONSTANTS.VIRTUAL_PLAYER_DURATION_MAX + CONSTANTS.VIRTUAL_PLAYER_DURATION_MIN);

            expect(tileValidityService.findPath).toHaveBeenCalledWith(
                aggressivePlayer,
                [0, 0],
                session.room.map._tiles
            );
            expect(playerMovementService.movePlayer).toHaveBeenCalledWith(
                'player1',
                session,
                [[1, 1], [0, 0]],
                expect.anything()
            );
        });

        it('should move closer to a player if no target is directly reachable', async () => {
            const aggressivePlayer: Player = {
                socketId: 'player1',
                isAgressive: true,
                position: { x: 5, y: 5 },
            } as Player;

            const distantPlayer: Player = {
                socketId: 'player2',
                position: { x: 10, y: 10 },
                userName: 'player2',
            } as Player;

            const session: ActiveSession = {
                room: {
                    players: [aggressivePlayer, distantPlayer],
                    map: {
                        _tiles: [[{}], [{}]],
                    },
                },
            } as ActiveSession;

            tileValidityService.getReachableTiles.mockReturnValue([[5, 5], [6, 5], [5, 6]]);
            tileValidityService.findPath.mockReturnValue([[5, 5], [6, 5]]);
            tileValidityService.getAdjacentTiles.mockReturnValue([[10, 10]]);

            await service.playTurn(session, aggressivePlayer, {} as any);
            jest.advanceTimersByTime(CONSTANTS.VIRTUAL_PLAYER_DURATION_MAX + CONSTANTS.VIRTUAL_PLAYER_DURATION_MIN);

            expect(tileValidityService.findPath).toHaveBeenCalledWith(
                aggressivePlayer,
                [6, 5],
                session.room.map._tiles
            );
            expect(playerMovementService.movePlayer).toHaveBeenCalledWith(
                'player1',
                session,
                [[5, 5], [6, 5]],
                expect.anything()
            );
        });

        it('should pick a defensive item if reachable for a defensive player', async () => {
            const defensivePlayer: Player = {
                socketId: 'player1',
                isAgressive: false,
                position: { x: 2, y: 2 },
            } as Player;

            const session: ActiveSession = {
                room: {
                    map: {
                        _tiles: [
                            [{}, { item: { itemType: ItemEnum.Battery } }],
                            [{}, {}],
                        ],
                    },
                },
            } as ActiveSession;

            tileValidityService.getReachableTiles.mockReturnValue([[1, 1]]);
            tileValidityService.findPath.mockReturnValue([[2, 2], [1, 1]]);

            await service.playTurn(session, defensivePlayer, {} as any);
            jest.advanceTimersByTime(CONSTANTS.VIRTUAL_PLAYER_DURATION_MAX + CONSTANTS.VIRTUAL_PLAYER_DURATION_MIN);

            expect(tileValidityService.findPath).toHaveBeenCalledWith(defensivePlayer, [1, 1], session.room.map._tiles);
            expect(playerMovementService.movePlayer).toHaveBeenCalledWith(
                'player1',
                session,
                [[2, 2], [1, 1]],
                expect.anything()
            );
        });

        it('should perform a random movement if no specific target exists', async () => {
            const neutralPlayer: Player = {
                socketId: 'virtual1',
                isAgressive: false,
                position: { x: 2, y: 2 },
            } as Player;

            const session: ActiveSession = {
                room: {
                    map: {
                        _tiles: [[{}], [{}]],
                    },
                },
            } as ActiveSession;

            tileValidityService.getReachableTiles.mockReturnValue([[2, 2], [3, 3]]);
            tileValidityService.findPath.mockReturnValue([[2, 2], [3, 3]]);

            await service.playTurn(session, neutralPlayer, {} as any);
            jest.advanceTimersByTime(CONSTANTS.VIRTUAL_PLAYER_DURATION_MAX + CONSTANTS.VIRTUAL_PLAYER_DURATION_MIN);

            expect(tileValidityService.getReachableTiles).toHaveBeenCalled();
            expect(playerMovementService.movePlayer).toHaveBeenCalledWith(
                'virtual1',
                session,
                [[2, 2], [3, 3]],
                expect.anything(),
            );
        });
    });
});
