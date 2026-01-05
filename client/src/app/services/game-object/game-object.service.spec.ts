import { TestBed } from '@angular/core/testing';
import { ITEM_COUNT, NB_ITEMS_MEDIUM_MAP, NO_OBJECT, OBJECT_COUNT_MAP, SIZE_MEDIUM_MAP, SIZE_SMALL_MAP } from '@app/constants';
import { MapPosition } from '@app/interfaces/map-position';
import { mockGameObjectZeroId } from '@app/mocks/mock-game';
import { mockPositions } from '@app/mocks/mock-map';
import { mockObjects } from '@app/mocks/mock-object';
import { mockSelectedTile } from '@app/mocks/mock-selected-tile';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { TileService } from '@app/services/tile/tile.service';
import { ToolService } from '@app/services/tool/tool.service';
import { GameMode, MapSize, ObjectType, TileType } from '@common/constants';
import { BehaviorSubject } from 'rxjs';
import { GameObjectService } from './game-object.service';

describe('GameObjectService', () => {
    let service: GameObjectService;
    let gameCreationServiceSpy: jasmine.SpyObj<GameCreationService>;
    let toolServiceSpy: jasmine.SpyObj<ToolService>;
    let tileServiceSpy: jasmine.SpyObj<TileService>;
    const mockGameObject = mockObjects[0];
    const mockGameObject2 = mockObjects[2];

    beforeEach(() => {
        tileServiceSpy = jasmine.createSpyObj('TileService', ['setTile', 'removeTile']);
        toolServiceSpy = jasmine.createSpyObj('ToolService', ['deactivateTileApplicator', 'setSelectedTile']);
        gameCreationServiceSpy = jasmine.createSpyObj('GameCreationService', [
            'getStoredSize',
            'updateDimensions',
            'isModifiable',
            'sizeSubject',
            'getGameMode',
        ]);
        gameCreationServiceSpy.sizeSubject = new BehaviorSubject<string | null>(null);
        gameCreationServiceSpy.getStoredSize.and.returnValue('size');
        gameCreationServiceSpy.updateDimensions.and.returnValue(SIZE_SMALL_MAP);
        TestBed.configureTestingModule({
            providers: [
                { provide: GameCreationService, useValue: gameCreationServiceSpy },
                { provide: ToolService, useValue: toolServiceSpy },
                { provide: TileService, useValue: tileServiceSpy },
            ],
        });
        service = TestBed.inject(GameObjectService);
        service.objects = mockObjects;
        service.objectsArray = [
            [ObjectType.Armor, NO_OBJECT],
            [NO_OBJECT, ObjectType.Spawn],
        ];
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize objectsArray correctly and set maxCount if mapSize is defined', () => {
        const mockMapSize = 'medium';
        service['gridSize'] = SIZE_MEDIUM_MAP;
        service['mapSize'] = mockMapSize;

        service.initObjectsArray();

        expect(service.objectsArray).toBeDefined();
        expect(service.objectsArray.length).toEqual(SIZE_MEDIUM_MAP);
        expect(service.maxCount).toBe(NB_ITEMS_MEDIUM_MAP);
    });

    describe('getObjectById', () => {
        it('should return the correct object by id', () => {
            const result = service.getObjectById(1);
            expect(result).toEqual(mockObjects[0]);
        });

        it('should return undefined if no object has the corresponding id', () => {
            const result = service.getObjectById(NO_OBJECT);
            expect(result).toBeUndefined();
        });
    });

    it('should return the object on tile', () => {
        const result = service.getGameObjectOnTile(0, 0);
        expect(result).toEqual(mockObjects[1]);
    });

    describe('updateObjectGridPosition', () => {
        it('should update the grid position and reset the drag when dragStartPosition exists', () => {
            service.dragStartPosition = mockSelectedTile;

            const gameObject = service.objects[1];
            service.updateObjectGridPosition(gameObject, 1, 0);

            expect(service.objectsArray[0][0]).toBe(NO_OBJECT);
            expect(service.objectsArray[1][0]).toBe(gameObject.id);
            // eslint-disable-next-line -- resetDrag is private and we want to spy for the test
            spyOn<any>(service, 'resetDrag');
            service.updateObjectGridPosition(gameObject, 1, 0);
            expect(service['resetDrag']).toHaveBeenCalled();
        });
    });

    describe('removeObjectByClick', () => {
        it('should remove object from grid with right-click selected tile', () => {
            service.objectsArray[0][0] = ObjectType.Armor;
            const mockEvent = new MouseEvent('click', { button: 2 });
            spyOn(service, 'getGameObjectOnTile').and.callThrough();

            spyOn(service, 'removeObjectFromGrid');

            service.removeObjectByClick(mockEvent, { row: 0, col: 0 });
            expect(service.removeObjectFromGrid).toHaveBeenCalled();
        });
    });

    describe('removeObjectFromGrid', () => {
        it('should remove object when right-click on object on tile', () => {
            service.objectsArray[0][0] = ObjectType.Armor;
            service.selectedTile = mockSelectedTile;
            service.removeObjectFromGrid(mockGameObject);

            expect(service.objectsArray[0][0]).toBe(NO_OBJECT);
        });

        it('should remove object from start tile when drag to another tile', () => {
            service.objectsArray[0][0] = ObjectType.Armor;
            service.dragStartPosition = mockSelectedTile;
            service.removeObjectFromGrid(mockGameObject);

            expect(service.objectsArray[0][0]).toBe(NO_OBJECT);
        });

        it('should set max count for countable object', () => {
            mockGameObject2.count = ITEM_COUNT;
            service['mapSize'] = 'medium';
            service.maxCount = OBJECT_COUNT_MAP[service['mapSize']];
            service.objectsArray[0][0] = mockGameObject2.id;
            service.dragStartPosition = mockSelectedTile;
            service.removeObjectFromGrid(mockGameObject2);

            expect(service.objectsArray[0][0]).toBe(NO_OBJECT);
            expect(mockGameObject2.count).toBe(ITEM_COUNT + 1);
        });

        it('should not increment object count if it is max count', () => {
            service['mapSize'] = 'medium';
            service.maxCount = ITEM_COUNT;
            service.objectsArray[0][0] = mockGameObject.id;
            service.dragStartPosition = mockSelectedTile;
            service.removeObjectFromGrid(mockGameObject);

            expect(service.objectsArray[0][0]).toBe(NO_OBJECT);
            expect(mockGameObject.count).toBe(service.maxCount);
        });
    });

    it('should reset object counts correctly when mapSize is defined', () => {
        service['mapSize'] = 'medium';
        service.resetObjectsCount();

        expect(service.objects[0].count).toBe(ITEM_COUNT);
        expect(service.objects[1].count).toBe(ITEM_COUNT);
        expect(service.objects[2].count).toBe(OBJECT_COUNT_MAP[service['mapSize']]);
    });

    describe('loadMapObjectCount', () => {
        beforeEach(() => {
            service['mapSize'] = MapSize.Small;
            service.objectsArray = [
                [1, NO_OBJECT, 2],
                [NO_OBJECT, NO_OBJECT, NO_OBJECT],
            ];
            service.getObjectById = jasmine.createSpy('getObjectById').and.callFake((id) => {
                return { id, count: 2 };
            });
            service.resetObjectsCount = jasmine.createSpy('resetObjectsCount');
        });

        it('should set maxCount based on mapSize', () => {
            service.loadMapObjectCount();
            service['mapSize'] = MapSize.Small;
            expect(service.maxCount).toBe(OBJECT_COUNT_MAP[service['mapSize']]);
        });

        it('should reset objects count', () => {
            service.loadMapObjectCount();
            expect(service.resetObjectsCount).toHaveBeenCalled();
        });
    });

    it('should set draggedObject if the gameObject exists', () => {
        spyOn(service, 'getGameObjectOnTile').and.returnValue(mockGameObject);
        service.checkGameObject(0, 0);
        expect(service.draggedObject).toEqual(mockGameObject);
    });

    it('should not set draggedObject if the gameObject does not exist', () => {
        spyOn(service, 'getGameObjectOnTile').and.returnValue(undefined);
        service.checkGameObject(0, 0);
        expect(service.draggedObject).toBeDefined();
    });

    it('should return true if the tile is ground', () => {
        const result = service.isValidTileForObject(0, 0, [
            [1, 1],
            [1, 1],
        ]);
        expect(result).toBeTrue();
    });

    it('isValidTileForObject should return false if it is a wall or a door', () => {
        let result = service.isValidTileForObject(0, 0, [
            [TileType.Wall, 1],
            [1, 1],
        ]);
        expect(result).toBeFalse();

        result = service.isValidTileForObject(0, 0, [
            [TileType.ClosedDoor, 1],
            [1, 1],
        ]);
        expect(result).toBeFalse();

        result = service.isValidTileForObject(0, 0, [
            [TileType.OpenDoor, 1],
            [1, 1],
        ]);
        expect(result).toBeFalse();
    });

    describe('onDrop', () => {
        beforeEach(() => {
            spyOn(service, 'updateObjectGridPosition');
        });

        it('should not call updateObjectGridPosition if the condition is not met', () => {
            service.draggedObject = null;
            const mockEvent = new DragEvent('drop');
            spyOn(service, 'isValidTileForObject').and.returnValue(false);
            service.onDrop(mockEvent, {
                position: { x: 0, y: 0 },
                tiles: [
                    [1, 1],
                    [1, 1],
                ],
                objects: [
                    [0, 0],
                    [1, 0],
                ],
            });
            expect(service.updateObjectGridPosition).not.toHaveBeenCalled();
        });

        it('should call updateObjectGridPosition if the condition is met', () => {
            service.draggedObject = mockGameObject;
            const mockEvent = new DragEvent('drop');
            spyOn(service, 'isValidTileForObject').and.returnValue(true);
            service.onDrop(mockEvent, {
                position: { x: 0, y: 0 },
                tiles: [
                    [1, 1],
                    [1, 1],
                ],
                objects: [
                    [NO_OBJECT, 0],
                    [1, 0],
                ],
            });
            expect(service.updateObjectGridPosition).toHaveBeenCalled();
        });
    });

    describe('handleGameObjectOnTile', () => {
        beforeEach(() => {
            spyOn(service, 'removeObjectFromGrid');
        });

        it('should call removeObjectFromGrid if condition is met', () => {
            spyOn(service, 'getGameObjectOnTile').and.returnValue(mockGameObject);
            spyOn(service, 'isValidTileForObject').and.returnValue(false);
            service.handleGameObjectOnTile({ row: 0, col: 0 }, [
                [1, 1],
                [1, 1],
            ]);
            expect(service.removeObjectFromGrid).toHaveBeenCalled();
        });

        it('should not call removeObjectFromGrid if condition is not met', () => {
            spyOn(service, 'getGameObjectOnTile').and.returnValue(undefined);
            spyOn(service, 'isValidTileForObject').and.returnValue(true);
            service.handleGameObjectOnTile({ row: 0, col: 0 }, [
                [0, 0],
                [0, 0],
            ]);
            expect(service.removeObjectFromGrid).not.toHaveBeenCalled();
        });

        it('should not call removeObjectFromGrid if the gameObject.id is 0', () => {
            spyOn(service, 'getGameObjectOnTile').and.returnValue(mockGameObjectZeroId);
            service.handleGameObjectOnTile({ row: 0, col: 0 }, [
                [1, 1],
                [1, 1],
            ]);
            expect(service.removeObjectFromGrid).not.toHaveBeenCalled();
        });
    });

    it('onDragStart should set the attributes and call checkGameObject', () => {
        const mockMapPosition: MapPosition = { row: 1, col: 1 };
        service.selectedTile = mockMapPosition;
        spyOn(service, 'checkGameObject');
        service.onDragStart(mockMapPosition.row, mockMapPosition.col);
        expect(service.selectedTile).toBeNull();
        expect(service.dragStartPosition).toEqual(mockMapPosition);
        expect(service.checkGameObject).toHaveBeenCalled();
    });

    it('should return the game mode', () => {
        gameCreationServiceSpy.getGameMode.and.returnValue(GameMode.CaptureTheFlag);
        expect(service.getGameMode()).toBe(GameMode.CaptureTheFlag);
    });

    it('should return the correct boolean', () => {
        gameCreationServiceSpy.isModifiable = false;
        expect(service.startMouseDrag(mockPositions[0], false)).toBeFalse();

        gameCreationServiceSpy.isModifiable = true;
        spyOn(service, 'onDragStart');
        expect(service.startMouseDrag(mockPositions[0], true)).toBeFalse();
        expect(toolServiceSpy.deactivateTileApplicator).toHaveBeenCalled();
    });

    it('should return the tiles nad handleTileClick', () => {
        spyOn(service, 'handleGameObjectOnTile');
        const tiles = [[1, 1]];
        expect(service.handleTileClick({ row: 0, col: 0 }, tiles, '1')).toEqual(tiles);
        expect(service.handleGameObjectOnTile).toHaveBeenCalled();
    });

    it('should return false on startDropItem and call the methods', () => {
        spyOn(service, 'onDrop');
        const mockEvent = jasmine.createSpyObj('DragEvent', ['preventDefault']);
        const tileInfo = { position: { x: 0, y: 0 }, tiles: [[1, 1]], objects: [[0, 0]] };
        expect(service.startDropItem(mockEvent, tileInfo)).toBeFalse();
        expect(service.onDrop).toHaveBeenCalled();
        expect(toolServiceSpy.setSelectedTile).toHaveBeenCalledWith('');
    });

    it('should return the correct matrix depending on isModifiable', () => {
        tileServiceSpy.removeTile.and.returnValue([[1, 1]]);
        gameCreationServiceSpy.isModifiable = true;
        const tileInfo = { position: { x: 0, y: 0 }, tiles: [[2, 1]], objects: [[0, 0]] };
        const mockEvent = new MouseEvent('Click', { button: 1 });
        spyOn(service, 'removeObjectByClick');
        expect(service.removeOnRightClick(mockEvent, tileInfo)).toEqual([[1, 1]]);
        expect(service.removeObjectByClick).toHaveBeenCalled();

        gameCreationServiceSpy.isModifiable = false;
        expect(service.removeOnRightClick(mockEvent, tileInfo)).toEqual(tileInfo.tiles);
    });
});
