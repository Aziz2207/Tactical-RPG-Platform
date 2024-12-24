import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GameService, GameState } from '@app/services/game/game.service';
import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { TileEnum } from '@common/tile-enum';
import { SocketService } from '../socket/socket.service';
import { PlayerMovementService } from './player-movement.service';

describe('PlayerMovementService', () => {
    let service: PlayerMovementService;
    let socketService: jasmine.SpyObj<SocketService>;
    let gameService: jasmine.SpyObj<GameService>;

    const mockTiles = [
        [{ _tileType: TileEnum.Grass }, { _tileType: TileEnum.Water }],
        [{ _tileType: TileEnum.Grass }, { _tileType: TileEnum.Rock }],
    ];

    beforeEach(() => {
        socketService = jasmine.createSpyObj('SocketService', ['send']);
        gameService = jasmine.createSpyObj('GameService', [], {
            gameState: {
                map: {
                    _tiles: mockTiles,
                    _size: 2,
                    _items: [],
                },
                activePlayer: {
                    position: { x: 0, y: 0 },
                },
                availableTiles: [
                    [0, 0],
                    [0, 1],
                    [1, 0],
                ],
            },
        });

        TestBed.configureTestingModule({
            providers: [PlayerMovementService, { provide: SocketService, useValue: socketService }, { provide: GameService, useValue: gameService }],
        });

        service = TestBed.inject(PlayerMovementService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('movePlayer', () => {
        it('should send movePlayer event through socket service', () => {
            const path: [number, number][] = [
                [0, 0],
                [1, 0],
            ];
            service.movePlayer(path);
            expect(socketService.send).toHaveBeenCalledWith('movePlayer', path);
        });
    });

    describe('findPath', () => {
        it('should return null if game state is invalid', () => {
            gameService.gameState = {
                player: {} as Player,
                activePlayer: undefined, // Simulate an invalid state with missing active player
                nextPlayer: undefined,
                players: [],
                time: 0,
                yourTurn: false,
                availableTiles: undefined,
                map: undefined, // Simulate an invalid state with no map
                actionMode: false,
                debugMode: signal(false),
            } as GameState;

            const result = service.findPath({ x: 1, y: 1 });
            expect(result).toBeNull();
        });

        it('should find a valid path to an accessible position', () => {
            const end: Position = { x: 1, y: 0 };
            const path = service.findPath(end);
            expect(path).toBeTruthy();
            expect(path?.length).toBeGreaterThan(0);
            expect(path?.[path.length - 1]).toEqual(end);
        });

        it('should return null for unreachable positions', () => {
            const end: Position = { x: 1, y: 1 }; // Rock tile
            const path = service.findPath(end);
            expect(path).toBeNull();
        });
        it('should return null if grid is not defined', () => {
            // Simulate a game state with an undefined grid
            gameService.gameState.map = undefined;

            const result = service.findPath({ x: 1, y: 1 });
            expect(result).toBeNull();
        });

        it('should return null if start position is not defined', () => {
            // Simulate a game state with an undefined start position
            gameService.gameState.activePlayer = undefined;

            const result = service.findPath({ x: 1, y: 1 });
            expect(result).toBeNull();
        });
    });

    describe('isValidTile', () => {
        it('should return true for available tiles', () => {
            expect(service.isValidTile(0, 0)).toBeTrue();
            expect(service.isValidTile(1, 0)).toBeTrue();
        });

        it('should return false for unavailable tiles', () => {
            expect(service.isValidTile(1, 1)).toBeFalse();
        });

        it('should return false when availableTiles is undefined', () => {
            gameService.gameState.availableTiles = undefined;
            expect(service.isValidTile(0, 0)).toBeFalse();
        });
    });

    describe('toggleDoor', () => {
        it('should send toggleDoor event through socket service', () => {
            const position: Position = { x: 1, y: 1 };
            service.toggleDoor(position);
            expect(socketService.send).toHaveBeenCalledWith('toggleDoor', position);
        });
    });
});
