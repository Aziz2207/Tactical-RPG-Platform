import { Item } from '@common/interfaces/item';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { Tile } from '@common/interfaces/tile';
import { TileEnum } from '@common/tile-enum';
import { Test, TestingModule } from '@nestjs/testing';
import { TileValidityService } from './tile-validity.service';

describe('TileValidityService', () => {
    let service: TileValidityService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TileValidityService],
        }).compile();

        service = module.get<TileValidityService>(TileValidityService);
    });

    describe('getReachableTiles', () => {
        it('should return reachable tiles within speed limit', () => {
            const mockMap: Map = {
                _tiles: [
                    [{ _tileType: 'grass' }, { _tileType: 'grass' }],
                    [{ _tileType: 'grass' }, { _tileType: 'grass' }],
                ] as Tile[][],
            } as Map;

            const mockPlayer: Player = {
                position: { x: 0, y: 0 },
                attributes: { currentSpeed: 2 },
            } as Player;

            const result = service.getReachableTiles(mockMap, mockPlayer);
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle null player or attributes', () => {
            const mockMap: Map = {
                _tiles: [[{ _tileType: 'grass' }]] as Tile[][],
            } as Map;

            const result = service.getReachableTiles(mockMap, null);
            expect(result).toEqual([]);
        });

        it('should not include unreachable tiles', () => {
            const mockMap: Map = {
                _tiles: [
                    [{ _tileType: 'grass' }, { _tileType: 'rock' }],
                    [{ _tileType: 'grass' }, { _tileType: 'grass' }],
                ] as Tile[][],
            } as Map;

            const mockPlayer: Player = {
                position: { x: 0, y: 0 },
                attributes: { currentSpeed: 1 },
            } as Player;

            const result = service.getReachableTiles(mockMap, mockPlayer);
            expect(result.some(([x, y]) => x === 1 && y === 0)).toBeFalsy();
        });
    });

    describe('isAdjascent', () => {
        it('should return true for adjacent positions', () => {
            const mockPlayer: Player = {
                position: { x: 1, y: 1 },
            } as Player;

            const adjacentPositions: Position[] = [
                { x: 1, y: 0 },
                { x: 1, y: 2 },
                { x: 0, y: 1 },
                { x: 2, y: 1 },
            ];

            adjacentPositions.forEach((pos) => {
                expect(service.isAdjascent(mockPlayer, pos)).toBeTruthy();
            });
        });

        it('should return false for non-adjacent positions', () => {
            const mockPlayer: Player = {
                position: { x: 1, y: 1 },
            } as Player;

            const nonAdjacentPositions: Position[] = [
                { x: 0, y: 0 },
                { x: 2, y: 2 },
                { x: 3, y: 1 },
            ];

            nonAdjacentPositions.forEach((pos) => {
                expect(service.isAdjascent(mockPlayer, pos)).toBeFalsy();
            });
        });

        it('should handle null player position', () => {
            const mockPlayer: Player = {
                position: null,
            } as Player;

            expect(service.isAdjascent(mockPlayer, { x: 0, y: 0 })).toBeFalsy();
        });
    });

    describe('isValidTile', () => {
        it('should return false for out of bounds coordinates', () => {
            const mockGrid: Tile[][] = [
                [
                    {
                        _tileType: TileEnum.Grass,
                        traversable: true,
                        imageSrc: '',
                        terrain: true,
                    },
                ],
            ];
            expect(service['isValidTile'](mockGrid, -1, 0)).toBeFalsy();
            expect(service['isValidTile'](mockGrid, 0, -1)).toBeFalsy();
            expect(service['isValidTile'](mockGrid, 1, 0)).toBeFalsy();
            expect(service['isValidTile'](mockGrid, 0, 1)).toBeFalsy();
        });

        it('should return false for invalid tile types', () => {
            const mockGrid: Tile[][] = [
                [
                    {
                        _tileType: TileEnum.Rock,
                        traversable: false,
                        imageSrc: '',
                        terrain: true,
                    },
                ],
                [
                    {
                        _tileType: TileEnum.ClosedDoor,
                        traversable: false,
                        imageSrc: '',
                        terrain: true,
                    },
                ],
            ];
            expect(service['isValidTile'](mockGrid, 0, 0)).toBeFalsy();
            expect(service['isValidTile'](mockGrid, 0, 1)).toBeFalsy();
        });

        it('should return false for tiles with players', () => {
            const mockGrid: Tile[][] = [
                [
                    {
                        _tileType: TileEnum.Grass,
                        traversable: true,
                        imageSrc: '',
                        terrain: true,
                        player: {} as Player,
                    },
                ],
            ];
            expect(service['isValidTile'](mockGrid, 0, 0)).toBeFalsy();
        });

        it('should return true for valid tiles', () => {
            const mockGrid: Tile[][] = [
                [
                    {
                        _tileType: TileEnum.Grass,
                        traversable: true,
                        imageSrc: '',
                        terrain: true,
                    },
                ],
            ];
            expect(service['isValidTile'](mockGrid, 0, 0)).toBeTruthy();
        });
    });
    describe('getAdjacentTiles', () => {
        let map: Tile[][];
    
        beforeEach(() => {
            map = [
                    [{}, {}, {}],
                    [{}, {}, {}],
                    [{}, {}, {}],
            ] as Tile[][];
        });
    
        it('should return all valid adjacent tiles for a position in the middle of the map', () => {
            const position: Position = { x: 1, y: 1 };
    
            const result = service.getAdjacentTiles(position, map);
    
            expect(result).toEqual([
                [1, 0],
                [1, 2],
                [0, 1],
                [2, 1],
            ]);
        });
    
        it('should handle edge positions correctly', () => {
            const position: Position = { x: 0, y: 0 };
    
            const result = service.getAdjacentTiles(position, map);
    
            expect(result).toEqual([
                [0, 1],
                [1, 0],
            ]);
        });
    
        it('should handle corner positions correctly', () => {
            const position: Position = { x: 2, y: 2 };
    
            const result = service.getAdjacentTiles(position, map);
    
            expect(result).toEqual([
                [2, 1],
                [1, 2],
            ]);
        });
    
        it('should return an empty array for out-of-bounds position', () => {
            const position: Position = { x: -1, y: -1 };
    
            const result = service.getAdjacentTiles(position, map);
    
            expect(result).toEqual([]);
        });
    });

    describe('boundsCheck', () => {
        let grid: Tile[][];
    
        beforeEach(() => {
            grid = [
                [{}, {}, {}],
                [{}, {}, {}],
                [{}, {}, {}],
            ] as Tile[][];
        });
    
        it('should return true for a position within bounds', () => {
            const position: Position = { x: 1, y: 1 };
            const result = service.boundsCheck(position, grid);
            expect(result).toBe(true);
        });
    
        it('should return false for a position with negative coordinates', () => {
            const position: Position = { x: -1, y: -1 };
            const result = service.boundsCheck(position, grid);
            expect(result).toBe(false);
        });
    
        it('should return false for a position outside the grid width', () => {
            const position: Position = { x: 3, y: 1 };
            const result = service.boundsCheck(position, grid);
            expect(result).toBe(false);
        });
    
        it('should return false for a position outside the grid height', () => {
            const position: Position = { x: 1, y: 3 };
            const result = service.boundsCheck(position, grid);
            expect(result).toBe(false);
        });
    
        it('should return true for a position at the grid boundary', () => {
            const position: Position = { x: 2, y: 2 };
            const result = service.boundsCheck(position, grid);
            expect(result).toBe(true);
        });
    });

    describe('findPath', () => {
        let grid: Tile[][];
        let player: Player;
    
        beforeEach(() => {
            grid = [
                [{ _tileType: 'grass' }, { _tileType: 'grass' }, { _tileType: 'grass' }],
                [{ _tileType: 'grass' }, { _tileType: 'rock' }, { _tileType: 'grass' }],
                [{ _tileType: 'grass' }, { _tileType: 'grass' }, { _tileType: 'grass' }],
            ] as unknown as Tile[][];
            player = {
                position: { x: 0, y: 0 },
            } as Player;
            jest.spyOn(service, 'isValidTile').mockImplementation((grid, x, y) => grid[y]?.[x]?._tileType === 'grass');
        });
    
        it('should return the shortest path to the target tile', () => {
            const targetTile: [number, number] = [2, 2];
            const result = service.findPath(player, targetTile, grid);
            expect(result).toEqual([
                [1, 0],
                [2, 0],
                [2, 1],
                [2, 2],
            ]);
        });
    
        it('should return an empty array if no path exists', () => {
            const targetTile: [number, number] = [1, 1];
            const result = service.findPath(player, targetTile, grid);
            expect(result).toEqual([]);
        });
    
        it('should handle the case where the player is already on the target tile', () => {
            const targetTile: [number, number] = [0, 0];
            const result = service.findPath(player, targetTile, grid);
            expect(result).toEqual([[0, 0]]);
        });
    
        it('should ignore already visited tiles', () => {
            const targetTile: [number, number] = [2, 0];
            jest.spyOn(service, 'getValidNeighbors').mockReturnValueOnce([
                [1, 0],
                [0, 1],
            ]);
            const result = service.findPath(player, targetTile, grid);
            expect(result).toEqual([
                [1, 0],
                [2, 0],
            ]);
        });
    });
    
    describe('getValidNeighbors', () => {
        let grid: Tile[][];
    
        beforeEach(() => {
            grid = [
                [{ _tileType: 'grass' }, { _tileType: 'grass' }, { _tileType: 'grass' }],
                [{ _tileType: 'grass' }, { _tileType: 'rock' }, { _tileType: 'grass' }],
                [{ _tileType: 'grass' }, { _tileType: 'grass' }, { _tileType: 'grass' }],
            ] as unknown as Tile[][];
            jest.spyOn(service, 'boundsCheck').mockImplementation(({ x, y }, grid) => x >= 0 && y >= 0 && x < grid[0].length && y < grid.length);
            jest.spyOn(service, 'isValidTile').mockImplementation((grid, x, y) => grid[y]?.[x]?._tileType === 'grass');
        });
    
        it('should return all valid neighbors for a central tile', () => {
            const pos: [number, number] = [1, 1];
            const result = service.getValidNeighbors(pos, grid);
            expect(result).toEqual([
                [0, 1],
                [2, 1],
                [1, 0],
                [1, 2],
            ]);
        });
    
        it('should return only valid neighbors for an edge tile', () => {
            const pos: [number, number] = [0, 1];
            const result = service.getValidNeighbors(pos, grid);
            expect(result).toEqual([
                [0, 0],
                [0, 2],
            ]);
        });
    
        it('should return only valid neighbors for a corner tile', () => {
            const pos: [number, number] = [0, 0];
            const result = service.getValidNeighbors(pos, grid);
            expect(result).toEqual([
                [1, 0],
                [0, 1],
            ]);
        });
    
        it('should filter out neighbors that are invalid tiles', () => {
            const pos: [number, number] = [1, 1];
            jest.spyOn(service, 'isValidTile').mockReturnValue(false);
            const result = service.getValidNeighbors(pos, grid);
            expect(result).toEqual([]);
        });
    });
    
    describe('calculateNearestPosition', () => {
        let map: Map;
        let player: Player;
    
        beforeEach(() => {
            map = {
                _size: 3,
                _tiles: [
                    [{}, {}, {}],
                    [{}, {}, {}],
                    [{}, {}, {}],
                ],
            } as unknown as Map;
    
            player = {
                position: { x: 1, y: 1 },
                inventory: [{}, {}, {}],
            } as Player;
    
            jest.spyOn(service, 'isValidTile').mockImplementation((tiles, x, y) => {
                return tiles[y]?.[x]?._tileType !== 'rock';
            });
    
            jest.spyOn(service, 'calculateDistance').mockImplementation((pos1, pos2) => {
                return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
            });
        });
    
        it('should return sorted nearest positions based on distance', () => {
            jest.spyOn(service, 'isValidTile').mockImplementation((tiles, x, y) => true);
    
            const result = service.calculateNearestPosition(player, map);
    
            expect(result).toEqual([
                { x: 1, y: 1 },
                { x: 0, y: 1 },
                { x: 1, y: 0 },
            ]);
        });
    
        it('should filter out invalid tiles', () => {
            jest.spyOn(service, 'isValidTile').mockImplementation((tiles, x, y) => y !== 1);
    
            const result = service.calculateNearestPosition(player, map);
    
            expect(result).toEqual([
                { x: 1, y: 0 },
                { x: 1, y: 2 },
                { x: 0, y: 0 },
            ]);
        });
    
        it('should limit results to the size of player inventory', () => {
            player.inventory = [{}, {}] as unknown as Item[];
    
            jest.spyOn(service, 'isValidTile').mockImplementation((tiles, x, y) => true);
    
            const result = service.calculateNearestPosition(player, map);
    
            expect(result.length).toBe(player.inventory.length);
        });
    
        it('should return an empty array if no valid positions are found', () => {
            jest.spyOn(service, 'isValidTile').mockImplementation(() => false);
    
            const result = service.calculateNearestPosition(player, map);
    
            expect(result).toEqual([]);
        });
    
        it('should handle an empty inventory', () => {
            player.inventory = [];
    
            jest.spyOn(service, 'isValidTile').mockImplementation((tiles, x, y) => true);
    
            const result = service.calculateNearestPosition(player, map);
    
            expect(result).toEqual([]);
        });
    });
    
    describe('Helper Methods', () => {
        describe('calculateDistance', () => {
            it('should calculate the Manhattan distance between two positions', () => {
                const playerPos: Position = { x: 1, y: 1 };
                const pFinal: Position = { x: 4, y: 5 };
    
                const result = service.calculateDistance(playerPos, pFinal);
    
                expect(result).toBe(4); // Maximum difference in x or y
            });
    
            it('should return 0 when the positions are the same', () => {
                const playerPos: Position = { x: 2, y: 2 };
                const pFinal: Position = { x: 2, y: 2 };
    
                const result = service.calculateDistance(playerPos, pFinal);
    
                expect(result).toBe(0);
            });
    
            it('should calculate correctly for negative positions', () => {
                const playerPos: Position = { x: -2, y: -3 };
                const pFinal: Position = { x: 1, y: 1 };
    
                const result = service.calculateDistance(playerPos, pFinal);
    
                expect(result).toBe(4);
            });
        });
    
        describe('countValidTiles', () => {
            let map: Map;
    
            beforeEach(() => {
                map = {
                    _tiles: [
                        [{ _tileType: 'grass' }, { _tileType: 'rock' }, { _tileType: 'grass' }],
                        [{ _tileType: 'grass' }, { _tileType: 'closedDoor' }, { _tileType: 'openDoor' }],
                        [{ _tileType: 'rock' }, { _tileType: 'grass' }, { _tileType: 'rock' }],
                    ],
                } as unknown as Map;
    
                jest.spyOn(service, 'isValidTile').mockImplementation((tiles, x, y) => {
                    return tiles[y]?.[x]?._tileType === 'grass';
                });
            });
    
            it('should count the number of valid tiles on the map', () => {
                const result = service.countValidTiles(map);
    
                expect(result).toBe(4);
            });
    
            it('should return 0 if there are no valid tiles', () => {
                jest.spyOn(service, 'isValidTile').mockReturnValue(false);
    
                const result = service.countValidTiles(map);
    
                expect(result).toBe(0);
            });
    
            it('should handle an empty map', () => {
                const emptyMap = { _tiles: [] } as unknown as Map;
    
                const result = service.countValidTiles(emptyMap);
    
                expect(result).toBe(0);
            });
        });
    
        describe('countDoors', () => {
            let map: Map;
    
            beforeEach(() => {
                map = {
                    _tiles: [
                        [{ _tileType: 'grass' }, { _tileType: 'closedDoor' }, { _tileType: 'openDoor' }],
                        [{ _tileType: 'rock' }, { _tileType: 'closedDoor' }, { _tileType: 'grass' }],
                        [{ _tileType: 'openDoor' }, { _tileType: 'grass' }, { _tileType: 'rock' }],
                    ],
                } as unknown as Map;
            });
    
            it('should count the number of doors (open and closed) on the map', () => {
                const result = service.countDoors(map);
    
                expect(result).toBe(4);
            });
    
            it('should return 0 if there are no doors on the map', () => {
                map = {
                    _tiles: [
                        [{ _tileType: 'grass' }, { _tileType: 'grass' }, { _tileType: 'rock' }],
                        [{ _tileType: 'rock' }, { _tileType: 'grass' }, { _tileType: 'grass' }],
                    ],
                } as unknown as Map;
    
                const result = service.countDoors(map);
    
                expect(result).toBe(0);
            });
    
            it('should handle an empty map', () => {
                const emptyMap = { _tiles: [] } as unknown as Map;
    
                const result = service.countDoors(emptyMap);
    
                expect(result).toBe(0);
            });
        });
    });
    
});
