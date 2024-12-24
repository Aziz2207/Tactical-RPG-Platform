import { TestBed } from '@angular/core/testing';
import { CONSTANTS } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { Map } from '@common/interfaces/map';
import { ModeEnum } from '@common/mode-enum';
import { of } from 'rxjs';
import { CommunicationService } from '../communication/communication.service';
import { AdminService } from './admin.service';

class MockCommunicationService {
    gameGet(id: string) {
        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };
        const game: Game = { title: 'Test Game', map: mockMap, size: 10, _id: id };
        return of(game);
    }
    gamesGet() {
        return of([
            { title: 'Game 1', _id: '1', isVisible: true },
            { title: 'Game 2', _id: '2', isVisible: false },
        ]);
    }
    gameDelete() {
        return of({});
    }
    gamePatch(id: string, patchData: Partial<Game>) {
        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };
        const game: Game = { ...patchData, _id: id, map: mockMap, size: 10 };
        return of(game);
    }

    importGame(game: Game) {
        return of(undefined);
    }

    exportGame(id: string) {
        const mockGame = {
            title: 'Test Game',
            size: 10,
            description: 'This is a test game',
        };
        return of(mockGame);
    }
}

describe('AdminService', () => {
    let service: AdminService;
    let communicationService: CommunicationService;
    let onConflictSpy: jasmine.Spy;

    beforeEach(() => {
        onConflictSpy = jasmine.createSpy('onConflict');
        TestBed.configureTestingModule({
            providers: [AdminService, { provide: CommunicationService, useClass: MockCommunicationService }],
        });

        service = TestBed.inject(AdminService);
        communicationService = TestBed.inject(CommunicationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call getGames() in constructor', () => {
        spyOn(communicationService, 'gamesGet').and.callThrough();

        service = new AdminService(communicationService);

        expect(communicationService.gamesGet).toHaveBeenCalled();
    });

    it('should update _internalList when _gameList emits', () => {
        const games = [
            { title: 'Game 1', _id: '1', isVisible: true },
            { title: 'Game 2', _id: '2', isVisible: false },
        ];

        service['_gameList'].next(games);

        expect(service['_internalList']).toEqual(games);
    });

    it('should not update _internalList when games is undefined', () => {
        service['_internalList'] = [{ title: 'Game 1', _id: '1', isVisible: true }];

        service['_gameList'].next(undefined);

        expect(service['_internalList']).toEqual([{ title: 'Game 1', _id: '1', isVisible: true }]);
    });

    it('should not update _internalList when games is empty array', () => {
        service['_internalList'] = [{ title: 'Game 1', _id: '1', isVisible: true }];

        service['_gameList'].next([]);

        expect(service['_internalList']).toEqual([{ title: 'Game 1', _id: '1', isVisible: true }]);
    });

    it('should call communicationService.gamesGet() and update _gameList in getGames()', () => {
        const games = [{ title: 'Game 1', _id: '1', isVisible: true }];
        spyOn(communicationService, 'gamesGet').and.returnValue(of(games));
        spyOn(service['_gameList'], 'next');

        service['getGames']();

        expect(communicationService.gamesGet).toHaveBeenCalled();
        expect(service['_gameList'].next).toHaveBeenCalledWith(games);
    });

    it('should call communicationService.gameGet() and update _selectedGameSubject in selectGame()', () => {
        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };
        const game: Game = { title: 'Test Game', map: mockMap, size: 10, _id: '123' };
        spyOn(communicationService, 'gameGet').and.returnValue(of(game));
        spyOn(service['_selectedGameSubject'], 'next');

        service.selectGame('123');

        expect(communicationService.gameGet).toHaveBeenCalledWith('123');
        expect(service['_selectedGameSubject'].next).toHaveBeenCalledWith(game);
        expect(service.currentGameID).toBe('123');
    });

    it('should not set currentGameID if game._id is undefined in selectGame()', () => {
        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };
        const game: Game = { title: 'Test Game', map: mockMap, size: 10 };
        spyOn(communicationService, 'gameGet').and.returnValue(of(game));
        spyOn(service['_selectedGameSubject'], 'next');

        service.selectGame('123');

        expect(communicationService.gameGet).toHaveBeenCalledWith('123');
        expect(service['_selectedGameSubject'].next).toHaveBeenCalledWith(game);
        expect(service.currentGameID).toBeUndefined();
    });

    it('should toggle visibility of the game and call reset in toggleVisibility()', () => {
        service['_internalList'] = [{ title: 'Game 1', _id: '1', isVisible: true }];

        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };
        const updatedGame: Game = { title: 'Game 1', _id: '1', isVisible: false, map: mockMap, size: 10 };

        spyOn(communicationService, 'gamePatch').and.returnValue(of(updatedGame));
        spyOn(service, 'reset');

        service.toggleVisibility('1');

        expect(communicationService.gamePatch).toHaveBeenCalledWith('1', { isVisible: false });
        expect(service.reset).toHaveBeenCalled();
    });

    it('should not call gamePatch if game is not found in toggleVisibility()', () => {
        service['_internalList'] = [{ title: 'Game 1', _id: '1', isVisible: true }];

        spyOn(communicationService, 'gamePatch');
        spyOn(service, 'reset');

        service.toggleVisibility('2');

        expect(communicationService.gamePatch).not.toHaveBeenCalled();
        expect(service.reset).not.toHaveBeenCalled();
    });

    it('should call communicationService.gameDelete() and reset in deleteGame()', () => {
        spyOn(communicationService, 'gameDelete').and.returnValue(of({}));
        spyOn(service, 'reset');

        service.deleteGame('1');

        expect(communicationService.gameDelete).toHaveBeenCalledWith('1');
        expect(service.reset).toHaveBeenCalled();
    });

    it('should set newGame in addGame()', () => {
        service.addGame(CONSTANTS.SMALL_MAP_SIZE, 'CTF');

        expect(service.newGame).toEqual({ size: 10, mode: 'CTF' });
    });

    it('should call getGames() and selectGame(currentGameID) in reset()', () => {
        spyOn(service, 'selectGame');

        service.currentGameID = '1';

        service.reset();

        expect(service.selectGame).toHaveBeenCalledWith('1');
    });

    it('should call getGames() and not call selectGame if currentGameID is undefined in reset()', () => {
        spyOn(service, 'selectGame');

        service.currentGameID = '';

        service.reset();

        expect(service.selectGame).not.toHaveBeenCalled();
    });

    it('should call communicationService.exportGame and download the file', () => {
        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };
        const mockGame = { title: 'Test Game', map: mockMap, size: 10, _id: '123' };
        spyOn(communicationService, 'exportGame').and.returnValue(of(mockGame));
        spyOn(window.URL, 'createObjectURL').and.returnValue('blob-url');
        spyOn(window.URL, 'revokeObjectURL');

        const aElement = document.createElement('a');
        const clickSpy = spyOn(aElement, 'click').and.stub();

        spyOn(document, 'createElement').and.callFake((tagName: string) => {
            return tagName === 'a' ? aElement : document.createElement(tagName);
        });

        service.exportGame('123');

        expect(communicationService.exportGame).toHaveBeenCalledWith('123');
        expect(aElement.href).toContain('blob-url');
        expect(aElement.download).toBe('Test Game.json');
        expect(clickSpy).toHaveBeenCalled();
        expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob-url');
    });

    it('should call communicationService.importGame and reset on success', () => {
        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };
        const mockGame = { title: 'Test Game', map: mockMap, size: 10, _id: '123' };
        spyOn(communicationService, 'importGame').and.returnValue(of(undefined));
        spyOn(service, 'reset');

        service.importGame(mockGame, onConflictSpy);

        expect(communicationService.importGame).toHaveBeenCalledWith(mockGame);
        expect(service.reset).toHaveBeenCalled();
        expect(onConflictSpy).not.toHaveBeenCalled();
    });
});
