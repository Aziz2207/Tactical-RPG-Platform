import { Overlay } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '@app/services/admin/admin.service';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';
import { SaveGameService } from '@app/services/save-game/save-game.service';
import { ModeEnum } from '@common/mode-enum';
import { of } from 'rxjs';
import { AdminGameComponent } from './admin-game.component';

describe('AdminGameComponent', () => {
    let component: AdminGameComponent;
    let fixture: ComponentFixture<AdminGameComponent>;
    let adminService: jasmine.SpyObj<AdminService>;
    let saveGameService: jasmine.SpyObj<SaveGameService>;
    let mapEditerService: jasmine.SpyObj<MapEditorService>;
    let dialog: jasmine.SpyObj<MatDialog>;

    beforeEach(async () => {
        const adminServiceSpy = jasmine.createSpyObj('AdminService', ['toggleVisibility', 'deleteGame']);
        const saveGameServiceSpy = jasmine.createSpyObj('SaveGameService', ['storeId']);
        const mapEditerServiceSpy = jasmine.createSpyObj('MapEditerService', ['setCurrentGame']);
        const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], { get: () => '' });

        await TestBed.configureTestingModule({
            imports: [AdminGameComponent],
            providers: [
                { provide: AdminService, useValue: adminServiceSpy },
                { provide: SaveGameService, useValue: saveGameServiceSpy },
                { provide: MapEditorService, useValue: mapEditerServiceSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: ActivatedRoute, useValue: activatedRouteSpy },
                Overlay,
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AdminGameComponent);
        component = fixture.componentInstance;
        adminService = TestBed.inject(AdminService) as jasmine.SpyObj<AdminService>;
        saveGameService = TestBed.inject(SaveGameService) as jasmine.SpyObj<SaveGameService>;
        mapEditerService = TestBed.inject(MapEditorService) as jasmine.SpyObj<MapEditorService>;
        dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

        adminService.stateSelection$ = of({
            _id: '1',
            title: 'test',
            map: {
                _tiles: [],
                _size: 10,
                _items: [],
                mode: ModeEnum.CTF,
            },
            prevImg: 'test.png',
            description: 'testdsc',
            size: 10,
            lastMod: '01-10-2024',
            isVisible: true,
        });

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set the currentGame', () => {
        component.ngOnInit();
        expect(component.currentGame).toEqual(jasmine.objectContaining({ _id: '1', title: 'test' }));
    });

    it('should change the visibility', () => {
        component.currentGame = {
            _id: '1',
            title: 'test',
            map: {
                _tiles: [],
                _size: 10,
                _items: [],
                mode: ModeEnum.CTF,
            },
            prevImg: 'test.png',
            description: 'testdsc',
            size: 10,
            lastMod: '01-10-2024',
            isVisible: true,
        };
        component.toggleVisibilityHandler();
        expect(adminService.toggleVisibility).toHaveBeenCalledWith('1');
    });

    it('should open the dialog and delete game', () => {
        const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of(true), close: null });
        dialog.open.and.returnValue(dialogRefSpyObj);

        component.currentGame = {
            _id: '1',
            title: 'test',
            map: {
                _tiles: [],
                _size: 10,
                _items: [],
                mode: ModeEnum.CTF,
            },
            prevImg: 'test.png',
            description: 'testdsc',
            size: 10,
            lastMod: '01-10-2024',
            isVisible: true,
        };
        component.openDialog();
        expect(dialog.open).toHaveBeenCalled();
        dialogRefSpyObj.afterClosed().subscribe(() => {
            expect(adminService.deleteGame).toHaveBeenCalledWith('1');
        });
    });

    it('should save the game data', async () => {
        component.currentGame = {
            _id: '1',
            title: 'test',
            map: {
                _tiles: [],
                _size: 10,
                _items: [],
                mode: ModeEnum.CTF,
            },
            prevImg: 'test.png',
            description: 'test',
            size: 10,
            lastMod: '01-10-2024',
            isVisible: true,
        };
        await component.saveInfoGame();
        expect(mapEditerService.setCurrentGame).toHaveBeenCalledWith('1');
        expect(saveGameService.storeId).toHaveBeenCalledWith('1');
    });
});
