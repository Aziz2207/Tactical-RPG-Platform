import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CreationDialogComponent } from '@app/components/creation-dialog/creation-dialog.component';
import { GameListComponent } from '@app/components/game-list/game-list.component';
import { SimpleDialogComponent } from '@app/components/simple-dialog/simple-dialog.component';
import { ErrorMessages } from '@app/constants';
import { mockGames } from '@app/mocks/mock-game';
import { GameListService } from '@app/services/game-list/game-list.service';
import { SaveGameService } from '@app/services/save-game/save-game.service';
import { Game } from '@common/interfaces/game';
import { of, throwError } from 'rxjs';
import { AdministrationPageComponent } from './administration-page.component';

describe('AdministrationPageComponent', () => {
    let component: AdministrationPageComponent;
    let fixture: ComponentFixture<AdministrationPageComponent>;
    let saveGameServiceSpy: jasmine.SpyObj<SaveGameService>;
    let gameListServiceSpy: jasmine.SpyObj<GameListService>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<SimpleDialogComponent>>;
    let routerSpy: jasmine.SpyObj<Router>;
    let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;

    beforeEach(async () => {
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open', 'afterClosed']);
        dialogRefMock = jasmine.createSpyObj('SimpleDialogComponent', ['open', 'afterClosed']);
        dialogRefMock.afterClosed.and.returnValue(of({ action: 'right', input: 'New Game Name' }));
        saveGameServiceSpy = jasmine.createSpyObj('SaveGameService', ['importGame', 'saveImportedGame', 'saveImportedGameWithNewName']);
        gameListServiceSpy = jasmine.createSpyObj('GameListService', ['getGames', 'refreshGameList', 'getAllGames']);
        gameListServiceSpy.getGames.and.returnValue(of(mockGames));
        gameListServiceSpy.getAllGames.and.returnValue(of(mockGames));
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        dialogSpy.open.and.returnValue(dialogRefMock);

        await TestBed.configureTestingModule({
            imports: [AdministrationPageComponent, GameListComponent, MatDialogModule],
            providers: [
                { provide: MatDialog, useValue: dialogSpy },
                { provide: SaveGameService, useValue: saveGameServiceSpy },
                { provide: GameListService, useValue: gameListServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: ActivatedRoute, useValue: activatedRouteSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AdministrationPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    beforeEach(() => {
        saveGameServiceSpy.importGame.and.returnValue(of({ name: 'Mock Game' } as Game));
        saveGameServiceSpy.saveImportedGameWithNewName.and.returnValue(of({}));
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    it('should open CreationDialogComponent when openPopUp() is called', () => {
        component.openPopUp();
        expect(dialogSpy.open).toHaveBeenCalledWith(CreationDialogComponent, { width: '40%', height: '50%' });
    });

    it('should trigger file input click when importGame() is called', () => {
        spyOn(component.fileInput.nativeElement, 'click');
        component.importGame();
        expect(component.fileInput.nativeElement.click).toHaveBeenCalled();
    });

    it('should handle file input and validate file size', () => {
        const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        Object.defineProperty(mockFile, 'size', { value: 1024 });

        const mockEvent = {
            target: {
                files: [mockFile],
            },
        } as unknown as Event;

        component.handleFileInput(mockEvent);

        expect(saveGameServiceSpy.importGame).toHaveBeenCalledWith(mockFile);
    });

    it('should display error dialog if file size exceeds limit', () => {
        const mockFile = new File(['test'], 'largefile.txt', { type: 'text/plain' });
        Object.defineProperty(mockFile, 'size', { value: 9999999 });

        const mockEvent = {
            target: {
                files: [mockFile],
            },
        } as unknown as Event;

        component.handleFileInput(mockEvent);

        expect(dialogSpy.open).toHaveBeenCalledWith(
            SimpleDialogComponent,
            jasmine.objectContaining({
                data: {
                    title: "Erreur lors de l'importation",
                    messages: [ErrorMessages.FileTooLarge],
                    options: ['OK'],
                },
            }),
        );
    });

    it('should handle errors during game import', () => {
        const mockFile = new File(['test'], 'invalidfile.txt', { type: 'text/plain' });
        Object.defineProperty(mockFile, 'size', { value: 1024 });

        const mockEvent = {
            target: {
                files: [mockFile],
            },
        } as unknown as Event;

        saveGameServiceSpy.importGame.and.returnValue(throwError(() => new Error('Invalid file')));

        component.handleFileInput(mockEvent);

        expect(dialogSpy.open).toHaveBeenCalledWith(
            SimpleDialogComponent,
            jasmine.objectContaining({
                data: {
                    title: "Erreur lors de l'importation",
                    messages: [ErrorMessages.InvalidFile],
                    options: ['OK'],
                },
            }),
        );
    });

    it('should handle game name conflict during import', () => {
        component.errorWhileImportingGame([ErrorMessages.NameAlreadyExists]);

        expect(dialogSpy.open).toHaveBeenCalledWith(
            SimpleDialogComponent,
            jasmine.objectContaining({
                data: jasmine.objectContaining({
                    messages: ['Un jeu portant ce nom existe déjà. Veuillez sélectionner un autre nom.'],
                    options: ['Annuler', 'Modifier'],
                }),
            }),
        );
    });

    it('should save game with new name if name conflict is resolved', () => {
        spyOn(component.gameListComponent, 'refreshGameList');

        component.errorWhileImportingGame([ErrorMessages.NameAlreadyExists]);

        expect(saveGameServiceSpy.saveImportedGameWithNewName).toHaveBeenCalledWith('New Game Name');
        expect(component.gameListComponent.refreshGameList).toHaveBeenCalled();
    });

    it('should handle successful game import', () => {
        spyOn(component.gameListComponent, 'refreshGameList');

        component.gameSuccessfullyImported();

        expect(dialogSpy.open).toHaveBeenCalledWith(
            SimpleDialogComponent,
            jasmine.objectContaining({
                data: {
                    title: 'Importation réussie',
                    messages: ['Le jeu a été importé avec succès!'],
                    options: ['OK'],
                },
            }),
        );

        dialogRefMock.afterClosed.and.returnValue(of(null));
        dialogSpy.open.and.returnValue(dialogRefMock);
        expect(component.gameListComponent.refreshGameList).toHaveBeenCalled();
    });

    it('should handle import game response as an array of errors', () => {
        const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        Object.defineProperty(mockFile, 'size', { value: 1024 });

        const mockEvent = {
            target: {
                files: [mockFile],
            },
        } as unknown as Event;

        const errorResponse = ['Error 1', 'Error 2'];
        saveGameServiceSpy.importGame.and.returnValue(of(errorResponse));

        component.handleFileInput(mockEvent);

        expect(saveGameServiceSpy.importGame).toHaveBeenCalledWith(mockFile);
        expect(dialogSpy.open).toHaveBeenCalledWith(
            SimpleDialogComponent,
            jasmine.objectContaining({
                data: {
                    title: "Erreur lors de l'importation",
                    messages: errorResponse,
                    options: ['OK'],
                },
            }),
        );
    });

    it('should handle error while saving imported game with new name', () => {
        let recursiveCallCount = 0;

        dialogSpy.open.and.returnValue(dialogRefMock);
        saveGameServiceSpy.saveImportedGameWithNewName.and.callFake(() => {
            if (recursiveCallCount === 0) {
                recursiveCallCount++;
                return throwError(() => new Error('Name already exists'));
            } else {
                return of({});
            }
        });

        component.errorWhileImportingGame([ErrorMessages.NameAlreadyExists]);

        expect(dialogSpy.open).toHaveBeenCalledWith(
            SimpleDialogComponent,
            jasmine.objectContaining({
                data: jasmine.objectContaining({
                    title: "Erreur lors de l'importation",
                    messages: ['Un jeu portant ce nom existe déjà. Veuillez sélectionner un autre nom.'],
                    options: ['Annuler', 'Modifier'],
                    confirm: true,
                    isInput: true,
                }),
            }),
        );

        expect(saveGameServiceSpy.saveImportedGameWithNewName).toHaveBeenCalledWith('New Game Name');

        expect(dialogSpy.open).toHaveBeenCalledTimes(2);
    });
});
