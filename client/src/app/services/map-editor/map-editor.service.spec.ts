import { TestBed } from '@angular/core/testing';
import { mockGameObject } from '@app/mocks/mock-game';
import { dummyMap } from '@app/mocks/mock-map';
import { mockObjects } from '@app/mocks/mock-object';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { GameObjectService } from '@app/services/game-object/game-object.service';
import { MapValidatorService } from '@app/services/map-validator/map-validator.service';
import { BehaviorSubject } from 'rxjs';
import { MapEditorService } from './map-editor.service';

describe('MapEditorService', () => {
    let service: MapEditorService;
    let gameCreationServiceSpy: jasmine.SpyObj<GameCreationService>;
    let gameObjectServiceSpy: jasmine.SpyObj<GameObjectService>;
    let mapValidatorServiceSpy: jasmine.SpyObj<MapValidatorService>;

    beforeEach(() => {
        const gameCreationSpy = jasmine.createSpyObj('GameCreationService', ['getStoredSize', 'sizeSubject']);
        const gameObjectSpy = jasmine.createSpyObj('GameObjectService', ['removeObjectFromGrid', 'isDraggingFromContainer']);
        const mapValidatorSpy = jasmine.createSpyObj('MapValidatorService', ['validMap']);
        TestBed.configureTestingModule({
            providers: [
                { provide: GameCreationService, useValue: gameCreationSpy },
                { provide: GameObjectService, useValue: gameObjectSpy },
                { provide: MapValidatorService, useValue: mapValidatorSpy },
            ],
        });
        service = TestBed.inject(MapEditorService);
        gameCreationServiceSpy = TestBed.inject(GameCreationService) as jasmine.SpyObj<GameCreationService>;
        gameObjectServiceSpy = TestBed.inject(GameObjectService) as jasmine.SpyObj<GameObjectService>;
        mapValidatorServiceSpy = TestBed.inject(MapValidatorService) as jasmine.SpyObj<MapValidatorService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getters', () => {
        it('should return isDraggingFromContainer from the gameObjectService', () => {
            gameObjectServiceSpy.isDraggingFromContainer = true;
            const result = service.isDraggingFromContainer();
            expect(result).toBeTrue();
        });

        it('should return the dragged object', () => {
            gameObjectServiceSpy.draggedObject = mockObjects[0];
            const result = service.getDraggedObject();
            expect(result).toBe(mockObjects[0]);
        });
        it('should return the grid size', () => {
            gameCreationServiceSpy.getStoredSize.and.returnValue('map size');
            const result = service.getGridSize();
            expect(result).toBe('map size');
        });

        it('should return validMap from the mapValidator', () => {
            mapValidatorServiceSpy.validMap = true;
            const result = service.isMapValid();
            expect(result).toBeTrue();
        });
    });

    describe('setters', () => {
        it('should set isDraggingFromContainer to false', () => {
            gameObjectServiceSpy.isDraggingFromContainer = true;
            service.onDragEnd();
            expect(gameObjectServiceSpy.isDraggingFromContainer).toBeFalse();
        });

        it('should set the map to edit to its attribute', () => {
            service.setMapToEdit(dummyMap);
            expect(service.mapToEdit).toBe(dummyMap);
        });
    });

    describe('isMapChosen', () => {
        it('should return the map to edit', () => {
            gameCreationServiceSpy.sizeSubject = new BehaviorSubject<string | null>(null);
            service.mapToEdit = dummyMap;
            const result = service.isMapChosen();
            expect(result).toBe(dummyMap);
        });

        it('should return the sizeSubject value if it is defined', () => {
            gameCreationServiceSpy.sizeSubject = new BehaviorSubject<string | null>('map size');
            const result = service.isMapChosen();
            expect(result).toBe('map size');
        });
    });

    it('should call removeObjectFromGrid from the gameObjectService', () => {
        service.removeObjectFromGrid(mockGameObject);
        expect(gameObjectServiceSpy.removeObjectFromGrid).toHaveBeenCalled();
    });
});
