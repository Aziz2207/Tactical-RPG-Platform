import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { GameGridComponent } from '@app/components/map-editor/game-grid/game-grid.component';
import { GameObjectsContainerComponent } from '@app/components/map-editor/game-objects-container/game-objects-container.component';
import { SimpleDialogComponent } from '@app/components/simple-dialog/simple-dialog.component';
import { NB_ITEMS_MEDIUM_MAP, NO_ITEM, RANDOM_ITEM, SIZE_MEDIUM_MAP, TEST_VALIDATION_DURATION } from '@app/constants';
import { dummyMap } from '@app/mocks/mock-map';
import { mockObjects } from '@app/mocks/mock-object';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { GameObjectService } from '@app/services/game-object/game-object.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { SaveGameService } from '@app/services/save-game/save-game.service';
import { GameMode } from '@common/constants';
import { PathRoute } from '@common/interfaces/route';
import { of } from 'rxjs';
import { MapEditorPageComponent } from './map-editor-page.component';

describe('MapEditorPageComponent', () => {
    let component: MapEditorPageComponent;
    let fixture: ComponentFixture<MapEditorPageComponent>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let routerSpy: jasmine.SpyObj<Router>;
    let gameObjectServiceSpy: jasmine.SpyObj<GameObjectService>;
    let gameCreationServiceSpy: jasmine.SpyObj<GameCreationService>;
    let gameObjectsContainerSpy: jasmine.SpyObj<GameObjectsContainerComponent>;
    let gameGridSpy: jasmine.SpyObj<GameGridComponent>;
    let saveGameServiceSpy: jasmine.SpyObj<SaveGameService>;
    let mapEditorServiceSpy: jasmine.SpyObj<MapEditorService>;
    let httpMock: HttpTestingController;

    beforeEach(async () => {
        gameObjectsContainerSpy = jasmine.createSpyObj('GameObjectsContainerComponent', ['objects']);
        saveGameServiceSpy = jasmine.createSpyObj('SaveGameService', ['saveNewGame', 'replaceMap']);
        gameCreationServiceSpy = jasmine.createSpyObj('GameCreationService', [
            'isNewGame',
            'updateDimensions',
            'sizeSubject',
            'resetGrid',
            'getGameMode',
        ]);
        gameObjectServiceSpy = jasmine.createSpyObj('GameObjectService', [
            'initObjectsArray',
            'resetObjectsCount',
            'removeObjectFromGrid',
            'objects',
        ]);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        mapEditorServiceSpy = jasmine.createSpyObj('MapEditorService', [
            'getGridSize',
            'isMapChosen',
            'onDragEnd',
            'getDraggedObject',
            'isDraggingFromContainer',
            'isMapValid',
            'removeObjectFromGrid',
        ]);
        mapEditorServiceSpy.mapToEdit = {
            _id: 'map',
            mode: GameMode.Classic,
            name: 'Test Map',
            description: 'Test Description',
            tiles: [
                [0, 0],
                [1, 1],
            ],
            itemPlacement: [
                [0, 1],
                [1, 0],
            ],
            dimension: SIZE_MEDIUM_MAP,
            nbPlayers: NB_ITEMS_MEDIUM_MAP,
            image: '',
            isSelected: false,
            lastModification: new Date(),
        };

        await TestBed.configureTestingModule({
            declarations: [],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of({}),
                        snapshot: { paramMap: { get: () => 'map' } },
                    },
                },
                { provide: GameObjectService, useValue: gameObjectServiceSpy },
                { provide: MapEditorService, useValue: mapEditorServiceSpy },
                { provide: SaveGameService, useValue: saveGameServiceSpy },
                { provide: GameGridComponent, useValue: gameGridSpy },
                { provide: GameObjectsContainerComponent, useValue: gameObjectsContainerSpy },
                { provide: GameCreationService, useValue: gameCreationServiceSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: Router, useValue: routerSpy },
            ],
        }).compileComponents();
        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(MapEditorPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        mapEditorServiceSpy.onDragEnd.and.callFake(() => {
            gameObjectServiceSpy.isDraggingFromContainer = false;
        });

        gameObjectServiceSpy.objects = mockObjects;
        gameCreationServiceSpy.loadedMapName = 'map title';
        gameCreationServiceSpy.loadedMapDescription = 'map description';
        gameObjectServiceSpy.draggedObject = mockObjects[0];
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should set the name and description if it is an existing map', () => {
        gameCreationServiceSpy.isNewGame = false;
        component.ngOnInit();
        expect(component.mapName).toBe(gameCreationServiceSpy.loadedMapName);
        expect(component.mapDescription).toBe(gameCreationServiceSpy.loadedMapDescription);
    });

    it('should call event.preventDefault on drag over ', () => {
        const mockEvent = jasmine.createSpyObj('DragEvent', ['preventDefault']);
        component.onDragOver(mockEvent);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should add object to container when drop outside grid', () => {
        const mockEvent = jasmine.createSpyObj('DragEvent', ['preventDefault']);
        component.onDropOutside(mockEvent);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should set isDraggingFromContainer to false on drag end', () => {
        gameObjectServiceSpy.isDraggingFromContainer = true;
        component.onDragEnd();
        expect(gameObjectServiceSpy.isDraggingFromContainer).toBeFalse();
    });

    it('should not call removeObjectFromGrid if the object is moving from the container', () => {
        mapEditorServiceSpy.getDraggedObject.and.returnValue(null);
        gameObjectServiceSpy.isDraggingFromContainer = true;
        mapEditorServiceSpy.isDraggingFromContainer.and.returnValue(true);
        const event = new DragEvent('drop');

        component.onDropOutside(event);
        expect(mapEditorServiceSpy.removeObjectFromGrid).not.toHaveBeenCalled();
    });

    it('should call removeObjectFromGrid if gameObject has id', () => {
        mapEditorServiceSpy.getDraggedObject.and.returnValue(mockObjects[0]);
        gameObjectServiceSpy.isDraggingFromContainer = false;
        const event = new DragEvent('drop');

        component.onDropOutside(event);
        expect(mapEditorServiceSpy.removeObjectFromGrid).toHaveBeenCalled();
    });

    it('should set the mapName and mapDescription when modifying a map', () => {
        gameCreationServiceSpy.isNewGame = false;
        component.handleReset();
        expect(component.mapName).toBe(gameCreationServiceSpy.loadedMapName);
        expect(component.mapDescription).toBe(gameCreationServiceSpy.loadedMapDescription);
    });

    it('should reset the map name and description when handleReset is called', () => {
        spyOn(component, 'updateMapName');
        spyOn(component, 'updateMapDescription');
        component.handleReset();
        expect(component.resetTrigger).toBeTrue();
        setTimeout(() => {
            expect(component.resetTrigger).toBeFalse();
        }, 0);
    });

    it("should set the map name and description to empty string when we're creating a new map", () => {
        gameCreationServiceSpy.isNewGame = true;
        component.handleReset();
        expect(component.mapName).toBe('');
        expect(component.mapDescription).toBe('');
    });

    it('should trigger save when handleSave is called', () => {
        component.handleSave();

        expect(component.saveTrigger).toBeTrue();

        setTimeout(() => {
            expect(component.saveTrigger).toBeFalse();
        }, 0);
    });

    // line 114 not covered by this test for some reason
    it('should navigate to /administration if user confirms exit in handleExit', fakeAsync(() => {
        const dialogRef: MatDialogRef<SimpleDialogComponent> = {
            afterClosed: () => of({ action: 'left' }),
            close: jasmine.createSpy('close'),
            disableClose: false,
        } as unknown as MatDialogRef<SimpleDialogComponent>;

        dialogSpy.open.and.returnValue(dialogRef);
        component.handleExit();
        expect(dialogSpy.open).toHaveBeenCalled();
        tick();
        expect(routerSpy.navigate).toHaveBeenCalledWith([PathRoute.Admin]);
    }));

    it('should update the map name when updateMapName is called', () => {
        const newName = 'New Map Name';
        component.updateMapName(newName);
        expect(component.mapName).toBe(newName);
    });

    it('should update the map description when updateMapDescription is called', () => {
        const newDescription = 'New Map Description';
        component.updateMapDescription(newDescription);
        expect(component.mapDescription).toBe(newDescription);
    });

    it('should set the grid attribute correctly', () => {
        component.setGrid(dummyMap.tiles);
        expect(component['tiles']).toBe(dummyMap.tiles);
    });

    it('should set the height attribute correctly', () => {
        const mockHeightValue = SIZE_MEDIUM_MAP;
        component.setHeight(mockHeightValue);
        expect(component['height']).toBe(mockHeightValue);
    });

    it('should set the new items matrix correctly', () => {
        const mockItemsValue = [
            [NO_ITEM, NO_ITEM, NO_ITEM, NO_ITEM, NO_ITEM],
            [NO_ITEM, RANDOM_ITEM, NO_ITEM, NO_ITEM, NO_ITEM],
        ];
        component.setItems(mockItemsValue);
        expect(component['items']).toBe(mockItemsValue);
    });

    it('should call saveNewGame if the map is new and is valid', (done) => {
        gameCreationServiceSpy.isNewGame = true;
        mapEditorServiceSpy.isMapValid.and.returnValue(true);
        component['startSaving']();
        setTimeout(() => {
            expect(saveGameServiceSpy.saveNewGame).toHaveBeenCalled();
            expect(saveGameServiceSpy.replaceMap).not.toHaveBeenCalled();
            done();
        }, TEST_VALIDATION_DURATION);
    });

    it('should call replaceMap if the map is not new and it is valid', (done) => {
        mapEditorServiceSpy.mapToEdit = dummyMap;
        gameCreationServiceSpy.isNewGame = false;
        mapEditorServiceSpy.isMapValid.and.returnValue(true);
        component['startSaving']();
        setTimeout(() => {
            expect(saveGameServiceSpy.saveNewGame).not.toHaveBeenCalled();
            expect(saveGameServiceSpy.replaceMap).toHaveBeenCalled();
            done();
        }, TEST_VALIDATION_DURATION);
    });
});
