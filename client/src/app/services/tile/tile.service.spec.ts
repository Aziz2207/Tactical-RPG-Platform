import { TestBed } from '@angular/core/testing';
import { NO_OBJECT, TileId } from '@app/constants';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { TileType } from '@common/constants';
import { TileService } from './tile.service';

describe('TileService', () => {
    let service: TileService;
    let gameCreationServiceSpy: jasmine.SpyObj<GameCreationService>;

    beforeEach(() => {
        gameCreationServiceSpy = jasmine.createSpyObj('GameCreationService', ['isNewGame'], {
            loadedTiles: [
                [TileType.Ground, TileType.Ground, TileType.Ground],
                [TileType.Ground, TileType.Ground, TileType.Ground],
                [TileType.Ground, TileType.Ground, TileType.Ground],
            ],
        });
        TestBed.configureTestingModule({
            providers: [TileService, { provide: GameCreationService, useValue: gameCreationServiceSpy }],
        });
        service = TestBed.inject(TileService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getTileImage', () => {
        it('should return the correct image path for each tile type', () => {
            expect(service.getTileImage(TileType.Ground)).toBe('./assets/images/tiles/grass.jpg');
            expect(service.getTileImage(TileType.Ice)).toBe('./assets/images/tiles/ice.jpg');
            expect(service.getTileImage(TileType.Wall)).toBe('./assets/images/tiles/wall.jpg');
            expect(service.getTileImage(TileType.Water)).toBe('./assets/images/tiles/water.jpg');
            expect(service.getTileImage(TileType.ClosedDoor)).toBe('./assets/images/tiles/closed-door.jpg');
            expect(service.getTileImage(TileType.OpenDoor)).toBe('./assets/images/tiles/open-door.jpg');
            expect(service.getTileImage(0)).toBe('');
        });
    });

    describe('setTile', () => {
        let array: number[][];

        beforeEach(() => {
            array = [
                [TileType.Ground, TileType.Ground],
                [TileType.Ground, TileType.Ground],
            ];
        });

        it('should set the tile to Ice when selectedTile is ice-tile', () => {
            service.setTile(TileId.Ice, 0, 0, array);
            expect(array[0][0]).toBe(TileType.Ice);
        });

        it('should set the tile to Wall when selectedTile is wall-tile', () => {
            service.setTile(TileId.Wall, 0, 1, array);
            expect(array[0][1]).toBe(TileType.Wall);
        });

        it('should set the tile to Water when selectedTile is water-tile', () => {
            service.setTile(TileId.Water, 1, 0, array);
            expect(array[1][0]).toBe(TileType.Water);
        });

        it('should toggle between OpenDoor and ClosedDoor for door-tile', () => {
            service.setTile(TileId.Door, 1, 1, array);
            expect(array[1][1]).toBe(TileType.ClosedDoor);

            service.setTile(TileId.Door, 1, 1, array);
            expect(array[1][1]).toBe(TileType.OpenDoor);

            service.setTile(TileId.Door, 1, 1, array);
            expect(array[1][1]).toBe(TileType.ClosedDoor);
        });

        it('should not change the array if selectedTile is invalid', () => {
            const initialTile = array[0][0];
            service.setTile('invalid-tile', 0, 0, array);
            expect(array[0][0]).toBe(initialTile);
        });
    });

    describe('removeTile', () => {
        it('should not change tiles if it is already a Ground tile and no object', () => {
            const mockEvent = new MouseEvent('click', { button: 2 });
            const mockTiles = [
                [TileType.Ground, TileType.Ground],
                [TileType.Ground, TileType.Ground],
            ];
            const result = service.removeTile(mockEvent, {
                position: { x: 0, y: 0 },
                tiles: mockTiles,
                objects: [
                    [NO_OBJECT, NO_OBJECT],
                    [NO_OBJECT, NO_OBJECT],
                ],
            });
            expect(result).toEqual(mockTiles);
        });

        it('should set tile to Ground if it is not a Ground tile and there is no object', () => {
            const mockEvent = new MouseEvent('click', { button: 2 });
            const mockTiles = [
                [TileType.Ice, TileType.Ground],
                [TileType.Water, TileType.Ground],
            ];
            const result = service.removeTile(mockEvent, {
                position: { x: 0, y: 0 },
                tiles: mockTiles,
                objects: [
                    [NO_OBJECT, NO_OBJECT],
                    [NO_OBJECT, NO_OBJECT],
                ],
            });
            expect(result).toEqual([
                [TileType.Ground, TileType.Ground],
                [TileType.Water, TileType.Ground],
            ]);
        });

        it('should not change tiles if there is an object', () => {
            const mockEvent = new MouseEvent('click', { button: 2 });
            const mockTiles = [
                [TileType.Ice, TileType.Ground],
                [TileType.Water, TileType.Ground],
            ];
            const result = service.removeTile(mockEvent, {
                position: { x: 0, y: 0 },
                tiles: mockTiles,
                objects: [
                    [1, 0],
                    [NO_OBJECT, NO_OBJECT],
                ],
            });
            expect(result).toEqual(mockTiles);
        });
    });
});
