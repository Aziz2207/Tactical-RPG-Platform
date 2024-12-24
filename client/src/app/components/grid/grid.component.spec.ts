import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientItem } from '@app/classes/item';
import { ClientMap } from '@app/classes/map';
import { ClientTile } from '@app/classes/tile';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';
import { CONSTANTS } from '@common/constants';
import { ItemEnum } from '@common/item-enum';
import { ModeEnum } from '@common/mode-enum'; // Add this import
import { TileEnum } from '@common/tile-enum';
import { of } from 'rxjs';
import { GridComponent } from './grid.component';

describe('GridComponent', () => {
    let component: GridComponent;
    let fixture: ComponentFixture<GridComponent>;
    let mockMapEditerService: jasmine.SpyObj<MapEditorService>;
    let mockTile: ClientTile;
    let mockItem: ClientItem;

    beforeEach(async () => {
        mockItem = new ClientItem(ItemEnum.ABomb, 1);
        mockTile = new ClientTile(TileEnum.Grass, mockItem);
        mockMapEditerService = jasmine.createSpyObj('MapEditerService', [
            'addItem',
            'deleteItem',
            'addDraggedItem',
            'changeDragOnItem',
            'setTile',
            'resetTile',
            'removeItem',
            'setTileToSelected',
        ]);
        mockMapEditerService.mapState$ = of({
            _size: CONSTANTS.SMALL_MAP_SIZE,
            _tiles: [[mockTile]],
            _items: [],
            mode: ModeEnum.BR,
        } as ClientMap);
        mockMapEditerService.isLeftDragging = false;
        mockMapEditerService.isRightDragging = false;

        await TestBed.configureTestingModule({
            imports: [GridComponent],
            providers: [{ provide: MapEditorService, useValue: mockMapEditerService }],
        }).compileComponents();

        fixture = TestBed.createComponent(GridComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should update grid styles', () => {
        const gridContainer = fixture.nativeElement.querySelector('.grid-container');
        component.updateGridStyles(CONSTANTS.SMALL_MAP_SIZE);
        expect(gridContainer.style.gridTemplateColumns).toBe('repeat(10, 1fr)');
        expect(gridContainer.style.gridTemplateRows).toBe('repeat(10, 1fr)');
    });

    it('should handle left mouse button click', () => {
        const event = new MouseEvent('mousedown', { button: 0 });
        component.mouseHit(event, 0, 0);
        expect(mockMapEditerService.isLeftDragging).toBeTrue();
        expect(mockMapEditerService.setTileToSelected).toHaveBeenCalledWith(0, 0);
    });

    it('should handle right mouse button click', () => {
        const event = new MouseEvent('mousedown', { button: 2 });
        component.mouseHit(event, 0, 0);
        expect(mockMapEditerService.isRightDragging).toBeTrue();
        expect(mockMapEditerService.resetTile).toHaveBeenCalledWith(0, 0);
    });

    it('should handle mouse drag with left button', () => {
        mockMapEditerService.isLeftDragging = true;
        const event = new MouseEvent('mousemove');
        component.mouseDrag(event, 1, 1);
        expect(mockMapEditerService.setTileToSelected).toHaveBeenCalledWith(1, 1);
    });

    it('should handle mouse drag with right button', () => {
        mockMapEditerService.isRightDragging = true;
        const event = new MouseEvent('mousemove');
        component.mouseDrag(event, 1, 1);
        expect(mockMapEditerService.resetTile).toHaveBeenCalledWith(1, 1);
    });

    it('should prevent default on drag over', () => {
        const event = new DragEvent('dragover');
        spyOn(event, 'preventDefault');
        component.onDragOver(event);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle item drop', () => {
        const event = new DragEvent('drop');
        Object.defineProperty(event, 'dataTransfer', {
            value: {
                getData: jasmine.createSpy('getData').and.returnValue('1'),
            },
        });
        component.onDrop(event, 0, 0);
        expect(mockMapEditerService.addItem).toHaveBeenCalledWith(0, 0, 1);
    });

    it('should handle left click on item', () => {
        const event = new MouseEvent('mousedown', { button: 0 });
        component.itemClickHandler(event, 0, 0);
        expect(mockMapEditerService.setTileToSelected).toHaveBeenCalledWith(0, 0);
    });

    it('should handle right click on item', () => {
        const event = new MouseEvent('mousedown', { button: 2 });
        component.itemClickHandler(event, 0, 0);
        expect(mockMapEditerService.removeItem).toHaveBeenCalledWith(0, 0);
    });

    it('should handle drag item start', () => {
        const event = new DragEvent('dragstart');
        const setDataSpy = jasmine.createSpy('setData');
        Object.defineProperty(event, 'dataTransfer', {
            value: { setData: setDataSpy },
        });
        component.dragItemStart(event, 1, 0, 0);
        expect(setDataSpy).toHaveBeenCalledWith('itemId', '1');
        expect(setDataSpy).toHaveBeenCalledWith('x', '0');
        expect(setDataSpy).toHaveBeenCalledWith('y', '0');
    });

    it('should initialize grid on ngOnInit', () => {
        component.ngOnInit();
        expect(component.grid).toEqual([[mockTile]]);
    });

    it('should clear grid on ngOnDestroy', () => {
        component.ngOnDestroy();
        expect(component.grid).toEqual([]);
    });

    it('should handle mouse drag with left button and different coordinates', () => {
        mockMapEditerService.isLeftDragging = true;
        component.lastX = 0;
        component.lastY = 0;
        const event = new MouseEvent('mousemove');
        component.mouseDrag(event, 1, 1);
        expect(mockMapEditerService.setTileToSelected).toHaveBeenCalledWith(1, 1);
    });

    it('should not handle mouse drag when coordinates are the same', () => {
        mockMapEditerService.isLeftDragging = true;
        component.lastX = 1;
        component.lastY = 1;
        const event = new MouseEvent('mousemove');
        component.mouseDrag(event, 1, 1);
        expect(mockMapEditerService.setTileToSelected).not.toHaveBeenCalled();
    });

    it('should handle item drop with valid itemId', () => {
        const event = new DragEvent('drop');
        Object.defineProperty(event, 'dataTransfer', {
            value: {
                getData: jasmine.createSpy('getData').and.returnValue('1'),
            },
        });
        component.onDrop(event, 0, 0);
        expect(mockMapEditerService.addItem).toHaveBeenCalledWith(0, 0, 1);
    });

    it('should handle item drop with invalid itemId', () => {
        const event = new DragEvent('drop');
        Object.defineProperty(event, 'dataTransfer', {
            value: {
                getData: jasmine.createSpy('getData').and.returnValue(''),
            },
        });
        component.onDrop(event, 0, 0);
        expect(mockMapEditerService.addItem).not.toHaveBeenCalled();
    });
});
