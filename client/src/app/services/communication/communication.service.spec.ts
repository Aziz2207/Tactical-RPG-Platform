import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CommunicationService } from '@app/services/communication/communication.service';
import { Game } from '@common/interfaces/game';
import { Map } from '@common/interfaces/map';
import { ModeEnum } from '@common/mode-enum';
import { environment } from 'src/environments/environment';

describe('CommunicationService', () => {
    let httpMock: HttpTestingController;
    let service: CommunicationService;
    let baseUrl: string;
    let gameUrl: string;
    let gamesUrl: string;

    let mockGame1: Game;
    let mockGame2: Game;
    let mockGame3: Game;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [CommunicationService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(CommunicationService);
        httpMock = TestBed.inject(HttpTestingController);

        baseUrl = environment.serverUrl;
        gameUrl = '/game';
        gamesUrl = '/game/all';

        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };

        mockGame1 = {
            title: 'Game 1',
            map: mockMap,
            size: 10,
            description: 'desc1',
            isVisible: false,
            _id: 'id1',
        };
        mockGame2 = {
            title: 'Game 2',
            map: mockMap,
            size: 10,
            description: 'desc2',
            isVisible: true,
            _id: 'id2',
        };
        mockGame3 = {
            title: 'Game 3',
            map: mockMap,
            size: 10,
            description: 'desc3',
            isVisible: true,
            _id: 'id3',
        };
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call http.get and return a game in gameGet', () => {
        service.gameGet('id3').subscribe((game) => {
            expect(game).toEqual(mockGame3);
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/id3`);
        expect(req.request.method).toBe('GET');
        req.flush(mockGame3);
    });

    it('should handle error in gameGet', () => {
        spyOn(console, 'error');
        service.gameGet('id4').subscribe((game) => {
            expect(game).toBeUndefined();
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/id4`);
        expect(req.request.method).toBe('GET');
        req.flush('Error', { status: 404, statusText: 'Not Found' });
    });

    it('should call http.get and return the list of games in gamesGet', () => {
        const title1 = mockGame1.title ? mockGame1.title : '';
        const title2 = mockGame2.title ? mockGame2.title : '';
        const title3 = mockGame3.title ? mockGame3.title : '';
        const _id1 = mockGame1._id ? mockGame1._id : '';
        const _id2 = mockGame2._id ? mockGame2._id : '';
        const _id3 = mockGame3._id ? mockGame3._id : '';
        const isVisible1 = mockGame1.isVisible ? mockGame1.isVisible : false;
        const isVisible2 = mockGame2.isVisible ? mockGame2.isVisible : false;
        const isVisible3 = mockGame3.isVisible ? mockGame3.isVisible : false;

        service.gamesGet().subscribe((games) => {
            expect(games).toEqual([
                { title: title1, _id: _id1, isVisible: isVisible1 },
                { title: title2, _id: _id2, isVisible: isVisible2 },
                { title: title3, _id: _id3, isVisible: isVisible3 },
            ]);
        });

        const req = httpMock.expectOne(`${baseUrl}${gamesUrl}`);
        expect(req.request.method).toBe('GET');
        req.flush([
            { title: title1, _id: _id1, isVisible: isVisible1 },
            { title: title2, _id: _id2, isVisible: isVisible2 },
            { title: title3, _id: _id3, isVisible: isVisible3 },
        ]);
    });

    it('should handle error in gamesGet', () => {
        spyOn(console, 'error');
        service.gamesGet().subscribe((games) => {
            expect(games).toBeUndefined();
        });

        const req = httpMock.expectOne(`${baseUrl}${gamesUrl}`);
        expect(req.request.method).toBe('GET');
        req.flush('Error', { status: 500, statusText: 'Server Error' });
    });

    it('should send a PUT request in gamePut and return the response', () => {
        service.gamePut(mockGame1).subscribe((response) => {
            expect(response.status).toBe(200);
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(mockGame1);
        req.event(new HttpResponse({ status: 200, statusText: 'OK' }));
    });

    it('should handle error in gamePut', () => {
        service.gamePut(mockGame1).subscribe({
            next: () => fail('should have failed with an error'),
            error: (error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBeDefined();
            },
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(mockGame1);

        req.flush('{"message": "Test error message"}', {
            status: 400,
            statusText: 'Bad Request',
        });
    });

    it('should delete game from server in gameDelete', () => {
        service.gameDelete('id1').subscribe((response) => {
            expect(response).toBeTruthy();
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/id1`);
        expect(req.request.method).toBe('DELETE');
        req.flush({});
    });

    it('should handle error in gameDelete', () => {
        spyOn(console, 'error');
        service.gameDelete('id4').subscribe((response) => {
            expect(response).toBeUndefined();
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/id4`);
        expect(req.request.method).toBe('DELETE');
        req.flush('Error', { status: 404, statusText: 'Not Found' });
    });

    it('should modify a game in gamePatch', () => {
        const patchData = { isVisible: true };
        const updatedGame = { ...mockGame1, ...patchData };

        service.gamePatch('id1', patchData).subscribe((game) => {
            expect(game).toEqual(updatedGame);
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/id1`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual(patchData);
        req.flush(updatedGame);
    });

    it('should handle error in gamePatch', () => {
        spyOn(console, 'error');
        const patchData = { isVisible: true };

        service.gamePatch('id4', patchData).subscribe((game) => {
            expect(game).toBeUndefined();
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/id4`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual(patchData);
        req.flush('Error', { status: 404, statusText: 'Not Found' });
    });

    it('should call http.get and return the exported game', () => {
        service.exportGame('id3').subscribe((game) => {
            expect(game).toEqual(mockGame3);
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/id3/export`);
        expect(req.request.method).toBe('GET');
        req.flush(mockGame3);
    });

    it('should handle error in exportGame', () => {
        spyOn(console, 'error');

        service.exportGame('id4').subscribe((game) => {
            expect(game).toBeUndefined();
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/id4/export`);
        expect(req.request.method).toBe('GET');
        req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should call http.put and successfully import a game', () => {
        const mockGameToImport = { ...mockGame1 };
        delete mockGameToImport._id;

        service.importGame(mockGame1).subscribe((response) => {
            expect(response).toEqual(mockGameToImport);
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/import`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({
            ...mockGameToImport,
            isVisible: false,
            map: { ...mockGameToImport.map, _size: 10 },
        });
        req.flush(mockGameToImport);
    });

    it('should handle 409 error in importGame', () => {
        const conflictError = {
            status: 409,
            error: { message: 'Game title already exists' },
        };

        service.importGame(mockGame1).subscribe({
            next: () => fail('Expected an error, but got a success response'),
            error: (error) => {
                expect(error.status).toBe(409);
                expect(error.error.message).toBe('Game title already exists');
            },
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/import`);
        expect(req.request.method).toBe('PUT');
        req.flush(conflictError.error, { status: conflictError.status, statusText: 'Conflict' });
    });

    it('should handle other errors in importGame', () => {
        const serverError = {
            status: 500,
            error: { message: 'Internal Server Error' },
        };

        service.importGame(mockGame1).subscribe({
            next: () => fail('Expected an error, but got a success response'),
            error: (error) => {
                expect(error.status).toBe(500);
                expect(error.error.message).toBe('Internal Server Error');
            },
        });

        const req = httpMock.expectOne(`${baseUrl}${gameUrl}/import`);
        expect(req.request.method).toBe('PUT');
        req.flush(serverError.error, { status: serverError.status, statusText: 'Internal Server Error' });
    });
});
