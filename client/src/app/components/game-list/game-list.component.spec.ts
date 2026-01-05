import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { mockGames } from '@app/mocks/mock-game';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { GameListService } from '@app/services/game-list/game-list.service';
import { MapEditorService } from '@app/services/map-editor/map-editor.service';
import { Game } from '@common/interfaces/game';
import { of } from 'rxjs';
import { GameListComponent } from './game-list.component';

describe('GameListComponent', () => {
    let component: GameListComponent;
    let fixture: ComponentFixture<GameListComponent>;
    let gameListServiceSpy: jasmine.SpyObj<GameListService>;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
    let mapEditorServiceSpy: jasmine.SpyObj<MapEditorService>;
    let gameCreationServiceSpy: jasmine.SpyObj<GameCreationService>;

    beforeEach(async () => {
        gameCreationServiceSpy = jasmine.createSpyObj('GameCreationService', ['convertMapDimension', 'setSelectedSize']);
        snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
        mapEditorServiceSpy = jasmine.createSpyObj('MapEditorService', ['setMapToEdit']);
        gameListServiceSpy = jasmine.createSpyObj('GameListService', [
            'getAllVisibleGames',
            'selectGame',
            'deselectGame',
            'getGames',
            'changeVisibility',
            'deleteGame',
            'setSelectedGame',
            'getAllGames',
            'exportGame',
        ]);

        await TestBed.configureTestingModule({
            imports: [MatSnackBarModule, BrowserAnimationsModule],
            providers: [
                { provide: MatSnackBar, useValue: snackBarSpy },
                { provide: GameListService, useValue: gameListServiceSpy },
                { provide: MapEditorService, useValue: mapEditorServiceSpy },
                { provide: GameCreationService, useValue: gameCreationServiceSpy },
            ],
        }).compileComponents();
        gameListServiceSpy.getGames.and.returnValue(of(mockGames));
        gameListServiceSpy.getAllVisibleGames.and.returnValue(of(mockGames));
        gameListServiceSpy.setSelectedGame.and.callFake((usingPage: string, game: Game, games: Game[]) => {
            if (usingPage === 'game-list') {
                games.forEach((g) => (g.isSelected = false));
                game.isSelected = true;
            }
        });

        gameListServiceSpy.selectGame.and.callFake((game: Game) => {
            game.isSelected = true;
        });
        gameListServiceSpy.deselectGame.and.callFake((games: Game[]) => {
            games.forEach((game) => (game.isSelected = false));
        });

        fixture = TestBed.createComponent(GameListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should get games on initialization', () => {
        expect(gameListServiceSpy.getGames).toHaveBeenCalled();
        expect(component.games).toEqual(mockGames);
    });

    it('should select a game and deselect others', () => {
        const gameToSelect: Game = { ...mockGames[0] };
        component.usingPage = 'game-list';
        component.selectGame(gameToSelect);
        expect(gameListServiceSpy.setSelectedGame).toHaveBeenCalledWith(component.usingPage, gameToSelect, mockGames);
        expect(gameToSelect.isSelected).toBeTrue();
        mockGames.forEach((game) => {
            if (game._id !== gameToSelect._id) {
                expect(game.isSelected).toBeFalse();
            }
        });
    });

    it('should call changeVisibility and handle error message on failure', () => {
        const game: Game = { ...mockGames[0] };
        gameListServiceSpy.changeVisibility.and.returnValue(of(false));
        spyOn(component, 'showErrorMessage');
        component.changeVisibility(game);
        expect(component.showErrorMessage).toHaveBeenCalled();
    });

    it('should refresh the game list when deleteGame is successful', () => {
        const game: Game = { ...mockGames[0] };
        gameListServiceSpy.deleteGame.and.returnValue(of(true));
        spyOn(component, 'refreshGameList');
        component.deleteGame(game);
        expect(component.refreshGameList).toHaveBeenCalled();
    });

    it('should show an error message when deleteGame fails', () => {
        const game: Game = { ...mockGames[0] };
        gameListServiceSpy.deleteGame.and.returnValue(of(false));
        spyOn(component, 'showErrorMessage');
        component.deleteGame(game);
        expect(gameListServiceSpy.deleteGame).toHaveBeenCalledWith(game);
        expect(component.showErrorMessage).toHaveBeenCalled();
    });

    it('should open the snack bar with the correct message and options', () => {
        component.showErrorMessage();
        expect(snackBarSpy.open).toHaveBeenCalledWith('Jeu déjà supprimé par un autre utilisateur', 'Fermer', { duration: 4000 });
    });
    it('should update games array when refreshGameList is called', () => {
        const mockGamesList: Game[] = [mockGames[0], mockGames[1]];
        gameListServiceSpy.getAllGames.and.returnValue(of(mockGamesList));
        component.refreshGameList();
        expect(gameListServiceSpy.getAllGames).toHaveBeenCalled();
        expect(component.games).toEqual(mockGamesList);
    });

    it('should export game when export logo is clicked', () => {
        const game = mockGames[0];
        component.exportGame(game);
        expect(gameListServiceSpy.exportGame).toHaveBeenCalledWith(game);
    });

    describe('convertMapDimension', () => {
        it('should edit game and navigate to edit-map', () => {
            const game = mockGames[0];
            component.editGame(game);

            expect(mapEditorServiceSpy.setMapToEdit).toHaveBeenCalledWith(game);
        });
    });
});
