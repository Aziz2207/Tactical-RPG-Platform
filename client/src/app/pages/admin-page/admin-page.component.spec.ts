import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ImportDialogComponent } from '@app/components/import-dialog/import-dialog.component';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { AdminService } from '@app/services/admin/admin.service';
import { GameService } from '@app/services/game/game.service';
import { SaveGameService } from '@app/services/save-game/save-game.service';
import { Game } from '@common/interfaces/game';
import { Map } from '@common/interfaces/map';
import { ModeEnum } from '@common/mode-enum';
import { of } from 'rxjs';

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let mockAdminService: jasmine.SpyObj<AdminService>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockSaveGameService: jasmine.SpyObj<SaveGameService>;
    let mockHttpClient: jasmine.SpyObj<HttpClient>;
    let mockGame: Game;
    let dialog: MatDialog;

    beforeEach(async () => {
        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };

        mockGame = {
            title: 'Game 1',
            map: mockMap,
            size: 10,
            description: 'desc1',
            isVisible: false,
            _id: 'id1',
        };
        mockAdminService = jasmine.createSpyObj('AdminService', ['reset', 'importGame']);
        mockAdminService.importGame.and.callFake((game, onConflict) => {
            onConflict({ ...game, title: 'Existing Game' });
        });
        Object.defineProperty(mockAdminService, 'importMessage$', { value: of('Test error message') });
        Object.defineProperty(mockAdminService, 'stateList$', { value: of([]) });
        Object.defineProperty(mockAdminService, 'stateSelection$', { value: of(undefined) });

        mockGameService = jasmine.createSpyObj('GameService', ['loadGame']);
        mockSaveGameService = jasmine.createSpyObj('SaveGameService', ['createGame']);
        mockHttpClient = jasmine.createSpyObj('HttpClient', ['get', 'post', 'put', 'delete']);

        await TestBed.configureTestingModule({
            imports: [AdminPageComponent, ImportDialogComponent],
            providers: [
                provideRouter([]),
                { provide: AdminService, useValue: mockAdminService },
                { provide: GameService, useValue: mockGameService },
                { provide: SaveGameService, useValue: mockSaveGameService },
                { provide: HttpClient, useValue: mockHttpClient },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AdminPageComponent);
        component = fixture.componentInstance;
        dialog = TestBed.inject(MatDialog);
        spyOn(dialog, 'open').and.returnValue({
            afterClosed: () => of('Resolved Title'),
        } as MatDialogRef<ImportDialogComponent>);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call adminService reset on init', () => {
        expect(mockAdminService.reset).toHaveBeenCalled();
    });

    it('should call adminService reset on destroy', () => {
        fixture.destroy();
        expect(mockAdminService.reset).toHaveBeenCalled();
    });

    it('should display the components', () => {
        const header = fixture.debugElement.query(By.css('app-header'));
        expect(header).toBeTruthy();
        const adminButton = fixture.debugElement.query(By.css('app-admin-button'));
        expect(adminButton).toBeTruthy();
        const adminGameSelectionList = fixture.debugElement.query(By.css('app-admin-game-selection-list'));
        expect(adminGameSelectionList).toBeTruthy();
        const adminGame = fixture.debugElement.query(By.css('app-admin-game'));
        expect(adminGame).toBeTruthy();
    });

    it('should display the add and import buttons', () => {
        const buttonsSection = fixture.debugElement.query(By.css('.buttons'));
        expect(buttonsSection).toBeTruthy();
        const addButton = buttonsSection.query(By.css('app-admin-button'));
        expect(addButton).toBeTruthy();
        const importButton = buttonsSection.query(By.css('app-import-button'));
        expect(importButton).toBeTruthy();
    });

    it('should call adminService.importGame and open dialog on conflict in onImportGame', () => {
        const conflictingGame = { ...mockGame, title: 'Conflicting Game' };
        mockAdminService.importGame.and.callFake((game, onConflict) => {
            onConflict(conflictingGame);
        });

        spyOn(component, 'openImportDialog');
        component.onImportGame(mockGame);

        expect(mockAdminService.importGame).toHaveBeenCalledWith(mockGame, jasmine.any(Function));
        expect(component.openImportDialog).toHaveBeenCalledWith(conflictingGame);
    });
    it('should open ImportDialogComponent and handle resolved title in openImportDialog', () => {
        const mockGame = {
            title: 'Game 1',
            _id: '1',
            size: 10,
            description: 'desc',
            isVisible: false,
            map: {
                _tiles: [],
                _size: 10,
                _items: [],
                mode: ModeEnum.BR,
            },
        };

        const dialogRefSpyObj = jasmine.createSpyObj({ afterClosed: of('Resolved Title'), close: null });
        spyOn(component['dialog'], 'open').and.returnValue(dialogRefSpyObj as MatDialogRef<ImportDialogComponent>);
        spyOn(component, 'onImportGame');
        component.openImportDialog(mockGame);

        expect(component['dialog'].open).toHaveBeenCalledWith(ImportDialogComponent, {
            data: { currentTitle: 'Game 1' },
            width: '450px',
            height: '300px',
            scrollStrategy: jasmine.anything(),
            panelClass: ['import-dialog-container'],
        });

        dialogRefSpyObj.afterClosed().subscribe((newTitle: string) => {
            expect(newTitle).toBe('Resolved Title');
            expect(mockGame.title).toBe('Resolved Title');
            expect(component.onImportGame).toHaveBeenCalledWith(mockGame);
        });
    });
});
