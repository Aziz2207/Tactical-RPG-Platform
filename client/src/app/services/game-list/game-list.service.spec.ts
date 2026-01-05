import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { mockGames } from '@app/mocks/mock-game';
import { GameMode } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GameListService } from './game-list.service';

describe('GameListService', () => {
    let httpMock: HttpTestingController;
    let service: GameListService;
    const allVisibleMapsUrl = `${environment.serverUrl}/maps/visible`;
    let selectedGameSubject: BehaviorSubject<Game | null>;
    const allMapsApiUrl = `${environment.serverUrl}/maps`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        service = TestBed.inject(GameListService);
        httpMock = TestBed.inject(HttpTestingController);
        selectedGameSubject = service['selectedGameSubject'];
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should get all visible maps', () => {
        const mockMaps: Game[] = [
            {
                _id: 'abcdefg',
                name: 'Map1',
                description: 'Description1',
                visible: true,
                mode: GameMode.CaptureTheFlag,
                nbPlayers: 6,
                image: 'img1',
                tiles: [[0, 1]],
                dimension: 20,
                itemPlacement: [[0, 1]],
                isSelected: false,
                lastModification: new Date(),
            },
        ];

        service.getAllVisibleGames().subscribe((maps) => {
            expect(maps.length).toBeGreaterThan(0);
            expect(maps[0].visible).toBe(true);
        });

        const req = httpMock.expectOne(allVisibleMapsUrl);
        expect(req.request.method).toBe('GET');
        req.flush(mockMaps);
    });

    it('should deselect all games and select a new game', () => {
        const gameToSelect: Game = { ...mockGames[0] };

        spyOn(service, 'deselectGame').and.callThrough();

        service.selectGame(gameToSelect, mockGames);

        expect(service.deselectGame).toHaveBeenCalledWith(mockGames);

        expect(gameToSelect.isSelected).toBeTrue();

        selectedGameSubject.subscribe((selectedGame) => {
            expect(selectedGame).toEqual(gameToSelect);
        });

        mockGames.forEach((game) => {
            if (game._id !== gameToSelect._id) {
                expect(game.isSelected).toBeFalse();
            }
        });
    });

    it('should deselect all games', () => {
        service.deselectGame(mockGames);

        mockGames.forEach((game) => {
            expect(game.isSelected).toBeFalse();
        });

        selectedGameSubject.subscribe((selectedGame) => {
            expect(selectedGame).toBeNull();
        });
    });

    it('should call getAllGames when usingPage is not "game-list"', () => {
        spyOn(service, 'getAllGames').and.returnValue(of(mockGames));

        service.getGames('other-page').subscribe((games: Game[]) => {
            expect(games).toEqual(mockGames);
        });
        expect(service.getAllGames).toHaveBeenCalled();
    });

    it('should call getAllVisibleGames when usingPage is "game-list"', () => {
        spyOn(service, 'getAllVisibleGames').and.returnValue(of(mockGames));

        service.getGames('game-list').subscribe((games: Game[]) => {
            expect(games).toEqual(mockGames);
        });
        expect(service.getAllVisibleGames).toHaveBeenCalled();
    });

    it('should retrieve all games from the API via GET', () => {
        service.getAllGames().subscribe((games) => {
            expect(games).toEqual(mockGames);
        });
        const req = httpMock.expectOne(allMapsApiUrl);
        expect(req.request.method).toBe('GET');
        req.flush(mockGames);
    });

    it('should deselect all games if the selected game is already selected and usingPage is "game-list"', () => {
        const games = [...mockGames];
        const selectedGame = games[0];
        selectedGame.isSelected = true;
        spyOn(service, 'deselectGame');
        spyOn(service, 'selectGame');
        service.setSelectedGame('game-list', selectedGame, games);
        expect(service.deselectGame).toHaveBeenCalled();
        expect(service.selectGame).not.toHaveBeenCalled();
    });

    it('should select all games if the selected game is already deselected and usingPage is "game-list"', () => {
        const games = [...mockGames];
        const selectedGame = games[0];
        selectedGame.isSelected = false;
        spyOn(service, 'deselectGame');
        spyOn(service, 'selectGame');
        service.setSelectedGame('game-list', selectedGame, games);
        expect(service.deselectGame).not.toHaveBeenCalled();
        expect(service.selectGame).toHaveBeenCalled();
    });

    it('should not select or deselect any game if usingPage is not "game-list"', () => {
        const games = [...mockGames];
        const gameToSelect = games[0];
        spyOn(service, 'deselectGame');
        spyOn(service, 'selectGame');
        service.setSelectedGame('adminstration-page', gameToSelect, games);
        expect(service.deselectGame).not.toHaveBeenCalled();
        expect(service.selectGame).not.toHaveBeenCalled();
    });

    it('should toggle visibility of the game and return true on success', () => {
        const game: Game = mockGames[0];
        const updatedGame: Game = { ...game, visible: false };
        service.performChangeVisibility(game).subscribe((result) => {
            expect(result).toBeTrue();
            expect(game.visible).toBe(false);
        });
        const req = httpMock.expectOne(`${allMapsApiUrl}/${game._id}`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ visible: false });

        req.flush(updatedGame);
    });

    it('should return false and not change visibility on HTTP error', () => {
        const game: Game = { ...mockGames[0], _id: '5555', visible: true };

        service.performChangeVisibility(game).subscribe((result) => {
            expect(result).toBeFalse();
        });
        const req = httpMock.expectOne(`${allMapsApiUrl}/${game._id}`);
        expect(req.request.method).toBe('PATCH');
        req.flush(null, { status: 500, statusText: 'Network error' });
    });

    it('should change visibility if the game exists', () => {
        const game: Game = { ...mockGames[0], visible: true };
        spyOn(service, 'performChangeVisibility').and.returnValue(of(true));
        service.changeVisibility(game).subscribe((result) => {
            expect(result).toBeTrue();
            expect(service.performChangeVisibility).toHaveBeenCalledWith(game);
        });
        const req = httpMock.expectOne(`${allMapsApiUrl}`);
        req.flush(mockGames);
    });

    it('should return false if the game does not exist when changing visibility', () => {
        const game: Game = { ...mockGames[0], _id: '21', name: 'abc' };
        service.changeVisibility(game).subscribe((result) => {
            expect(result).toBeFalse();
        });
        const req = httpMock.expectOne(`${allMapsApiUrl}`);
        req.flush(mockGames);
    });

    it('should delete the game if it exists and return true', () => {
        const game: Game = mockGames[0];
        service.deleteGame(game).subscribe((result) => {
            expect(result).toBeTrue();
        });
        const checkExistsReq = httpMock.expectOne(allMapsApiUrl);
        expect(checkExistsReq.request.method).toBe('GET');
        checkExistsReq.flush([game]);

        const deleteReq = httpMock.expectOne(`${allMapsApiUrl}/${game._id}`);
        expect(deleteReq.request.method).toBe('DELETE');
    });

    it('should return false if the game does not exist', () => {
        const game: Game = mockGames[0];

        service.deleteGame(game).subscribe((result) => {
            expect(result).toBeFalse();
        });
        const req = httpMock.expectOne(allMapsApiUrl);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('should return true if the visible game exist', () => {
        const mockGame: Game = { ...mockGames[0] };

        service.getAllVisibleGames = jasmine.createSpy().and.returnValue(of([mockGame]));
        service.checkIfVisibleGameExists(mockGame).subscribe((result) => {
            expect(result).toEqual(mockGame);
        });
    });

    it('should return false if the visible game does NOT exist', () => {
        const mockGame: Game = { ...mockGames[0] };

        service.getAllVisibleGames = jasmine.createSpy().and.returnValue(of([]));
        service.checkIfVisibleGameExists(mockGame).subscribe((result) => {
            expect(result).toEqual(null);
        });
    });

    it('should return false when there is an error fetching visible games', () => {
        const mockGame: Game = { ...mockGames[0] };

        service.getAllVisibleGames = jasmine.createSpy().and.returnValue(throwError(() => new Error('Error fetching games')));

        service.checkIfVisibleGameExists(mockGame).subscribe((result) => {
            expect(result).toEqual(null);
        });
    });

    it('should return false if an error occurs during checkIfGameExists', () => {
        const game: Game = { ...mockGames[0], _id: '21', name: 'abc' };

        service.deleteGame(game).subscribe((result) => {
            expect(result).toBeFalse();
        });

        const req = httpMock.expectOne(allMapsApiUrl);
        expect(req.request.method).toBe('GET');
        req.flush(null, { status: 500, statusText: 'Network error' });
    });

    it('should return false if an error occurs during performDeleteGame', () => {
        const game: Game = mockGames[0];

        service.deleteGame(game).subscribe((result) => {
            expect(result).toBeFalse();
        });
        const checkExistsReq = httpMock.expectOne(allMapsApiUrl);
        expect(checkExistsReq.request.method).toBe('GET');
        checkExistsReq.flush([game]);

        const deleteReq = httpMock.expectOne(`${allMapsApiUrl}/${game._id}`);
        expect(deleteReq.request.method).toBe('DELETE');
        deleteReq.flush(null, { status: 500, statusText: 'Network error' });
    });

    it('should export game as JSON file', () => {
        const game: Game = { _id: '1', name: 'Test Game', visible: true } as Game;
        spyOn(window.URL, 'createObjectURL').and.returnValue('blob-url');
        spyOn(window.URL, 'revokeObjectURL');

        service.exportGame(game);

        expect(window.URL.createObjectURL).toHaveBeenCalled();
        expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should return true when performDeleteGame successfully deletes the game', () => {
        const game: Game = mockGames[0];

        service['performDeleteGame'](game).subscribe((result) => {
            expect(result).toBeTrue();
        });

        const req = httpMock.expectOne(`${allMapsApiUrl}/${game._id}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
