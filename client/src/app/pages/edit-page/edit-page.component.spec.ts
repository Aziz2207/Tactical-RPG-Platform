import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { ClientMap } from '@app/classes/map';
import { EditErrorDialogComponent } from '@app/components/edit-error-dialog/edit-error-dialog.component';
import { GridComponent } from '@app/components/grid/grid.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { ItemComponent } from '@app/components/item/item.component';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';
import { SaveGameService } from '@app/services/save-game/save-game.service';
import { CONSTANTS } from '@common/constants';
import { ModeEnum } from '@common/mode-enum';
import { TileEnum } from '@common/tile-enum';
import { Subject, of } from 'rxjs';
import { EditPageComponent } from './edit-page.component';

describe('EditPageComponent', () => {
    let component: EditPageComponent;
    let fixture: ComponentFixture<EditPageComponent>;
    let mockMapEditerService: jasmine.SpyObj<MapEditorService>;
    let mockSaveGameService: jasmine.SpyObj<SaveGameService>;

    beforeEach(async () => {
        mockMapEditerService = jasmine.createSpyObj('MapEditerService', [
            'reinitialise',
            'setSelectedTile',
            'resetMap',
            'submit',
            'removeItem',
            'getSelectedTile',
            'getSelectedGame',
        ]);
        mockMapEditerService.errorMessage$ = new Subject<string>();
        mockMapEditerService.mapState$ = of({
            _size: 10,
            _tiles: [[]],
            _items: [],
            mode: ModeEnum.BR,
        } as ClientMap);
        mockMapEditerService.gameName = 'Test Game';
        mockMapEditerService.gameDescription = 'Test Description';

        mockSaveGameService = jasmine.createSpyObj('SaveGameService', ['resetId', 'addGamePrev']);
        mockSaveGameService.errorMessage$ = new Subject<string>();

        await TestBed.configureTestingModule({
            imports: [FormsModule, GridComponent, HeaderComponent, ItemComponent],
            providers: [
                { provide: MapEditorService, useValue: mockMapEditerService },
                { provide: SaveGameService, useValue: mockSaveGameService },
                provideRouter([]),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditPageComponent);
        component = fixture.componentInstance;

        component.gameName = 'Test Game';
        component.gameDescription = 'Test Description';
        component.gamePrev = '';
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call reinitialise and resetId on ngOnDestroy', () => {
        component.ngOnDestroy();
        expect(mockMapEditerService.reinitialise).toHaveBeenCalled();
        expect(mockSaveGameService.resetId).toHaveBeenCalled();
    });

    it('should add event listeners on ngOnInit', () => {
        spyOn(window, 'addEventListener');
        component.ngOnInit();
        expect(window.addEventListener).toHaveBeenCalledWith('drop', jasmine.any(Function));
        expect(window.addEventListener).toHaveBeenCalledWith('dragover', jasmine.any(Function));
    });

    it('should check for selected game on ngOnInit', () => {
        component.ngOnInit();
        expect(mockMapEditerService.getSelectedGame).toHaveBeenCalled();
    });

    it('should switch tile', () => {
        component.switchTile(TileEnum.Grass);
        expect(mockMapEditerService.setSelectedTile).toHaveBeenCalledWith(TileEnum.Grass);
    });

    it('should end drag', () => {
        mockMapEditerService.isLeftDragging = true;
        mockMapEditerService.isRightDragging = true;
        component.endDrag();
        expect(mockMapEditerService.isLeftDragging).toBeFalse();
        expect(mockMapEditerService.isRightDragging).toBeFalse();
    });

    it('should reset game', () => {
        component.resetGame();
        expect(mockMapEditerService.resetMap).toHaveBeenCalled();
    });

    it('should capture grid', fakeAsync(() => {
        const mockCanvas = document.createElement('canvas');
        const mockDataUrl = '';
        spyOn(mockCanvas, 'toDataURL').and.returnValue(mockDataUrl);

        jasmine.createSpy('html2canvas').and.resolveTo(mockCanvas);

        component.captureGrid();
        tick();
        expect(component.gamePrev).toBe(mockDataUrl);
    }));

    it('should save game', fakeAsync(() => {
        spyOn(component, 'captureGrid').and.returnValue(Promise.resolve());
        component.saveGame();
        tick();
        expect(component.captureGrid).toHaveBeenCalled();
        expect(mockSaveGameService.addGamePrev).toHaveBeenCalledWith(component.gamePrev);
        expect(mockMapEditerService.submit).toHaveBeenCalled();
    }));

    it('should handle drop outside', () => {
        const mockEvent = {
            dataTransfer: {
                getData: jasmine.createSpy('getData').and.returnValues('5', '10'),
            },
        } as unknown as DragEvent;
        component.onDropOutside(mockEvent);
        expect(mockMapEditerService.removeItem).toHaveBeenCalledWith(5, CONSTANTS.SMALL_MAP_SIZE);
    });

    it('should initialize properties correctly', () => {
        expect(component.gameName).toBe('Test Game');
        expect(component.gameDescription).toBe('Test Description');
        expect(component.gamePrev).toBe('');
        expect(component.tileEnum).toBe(TileEnum);
        expect(component.maxName).toBe(CONSTANTS.MAX_NAME_LENGTH);
        expect(component.maxDescription).toBe(CONSTANTS.MAX_DESCRIPTION_LENGTH);
    });

    it('should open error dialog with correct message and set isDialogOpen to true', () => {
        const mockMessage = 'Test Error Message - ID: 12345';
        const cleanMessage = 'Test Error Message';

        const mockDialogRef = {
            afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(true)),
        };

        spyOn(component['dialog'], 'open').and.returnValue(mockDialogRef as any);

        component.openErrorDialog(mockMessage);

        expect(component['dialog'].open).toHaveBeenCalledWith(EditErrorDialogComponent, {
            data: { message: cleanMessage },
            width: '600px',
            height: '200px',
            scrollStrategy: component['overlay'].scrollStrategies.noop(),
            panelClass: ['edit-error-dialog-container'],
        });

        expect(component['isDialogOpen']).toBeFalse();

        mockDialogRef.afterClosed().subscribe(() => {
            expect(component['isDialogOpen']).toBeFalse();
        });
    });
});
