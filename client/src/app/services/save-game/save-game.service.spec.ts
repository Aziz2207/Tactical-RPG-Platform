import { HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ClientMap } from '@app/classes/map';
import { CommunicationService } from '@app/services/communication/communication.service';
import { SaveGameService } from '@app/services/save-game/save-game.service';
import { CONSTANTS } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { ModeEnum } from '@common/mode-enum';
import { of, throwError } from 'rxjs';

describe('SaveGameService', () => {
    let service: SaveGameService;
    let mockCommunicationService: jasmine.SpyObj<CommunicationService>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(() => {
        mockCommunicationService = jasmine.createSpyObj('CommunicationService', ['gamePut']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            providers: [
                SaveGameService,
                { provide: CommunicationService, useValue: mockCommunicationService },
                { provide: Router, useValue: mockRouter },
            ],
        });
        service = TestBed.inject(SaveGameService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('createGame', () => {
        it('should create a new game and navigate to admin page on success', () => {
            const mockMap = new ClientMap(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);
            const mockGame: Game = {
                title: 'Test Game',
                map: mockMap,
                size: 10,
                description: 'Test Description',
                prevImg: 'test.jpg',
                isVisible: false,
            };

            service['gameName'] = mockGame.title ?? '';
            service['gameMap'] = mockMap;
            service['gameDescription'] = mockGame.description ?? '';
            service['gamePrev'] = mockGame.prevImg ?? '';

            const mockResponse = new HttpResponse<string>({ status: 200, statusText: 'OK' });
            mockCommunicationService.gamePut.and.returnValue(of(mockResponse));

            service.createGame();

            expect(mockCommunicationService.gamePut).toHaveBeenCalledWith(mockGame);
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
        });

        it('should update an existing game when _idExistingGame is set', () => {
            const mockMap = new ClientMap(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);
            const mockGame: Game = {
                _id: 'existingId',
                title: 'Test Game',
                map: mockMap,
                size: 10,
                description: 'Test Description',
                prevImg: 'test.jpg',
                isVisible: false,
            };

            service['gameName'] = mockGame.title ?? '';
            service['gameMap'] = mockMap;
            service['gameDescription'] = mockGame.description ?? '';
            service['gamePrev'] = mockGame.prevImg ?? '';
            service['_idExistingGame'] = 'existingId';

            const mockResponse = new HttpResponse<string>({ status: 200, statusText: 'OK' });
            mockCommunicationService.gamePut.and.returnValue(of(mockResponse));

            service.createGame();

            expect(mockCommunicationService.gamePut).toHaveBeenCalledWith(mockGame);
            expect(service['_idExistingGame']).toBeUndefined();
        });

        it('should emit an error message on error', () => {
            const mockMap = new ClientMap(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);
            service['gameName'] = 'Test Game';
            service['gameMap'] = mockMap;
            service['gameDescription'] = 'Test Description';
            service['gamePrev'] = 'test.jpg';

            const errorMessage = 'Error creating game';
            mockCommunicationService.gamePut.and.returnValue(throwError(() => new Error(errorMessage)));

            spyOn(service.errorMessage$, 'next');

            service.createGame();

            expect(mockCommunicationService.gamePut).toHaveBeenCalled();
            expect(service.errorMessage$.next).toHaveBeenCalledWith(errorMessage);
        });
    });

    describe('addInfo', () => {
        it('should set game information correctly', () => {
            const mockMap = new ClientMap(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);
            const gameName = 'Test Game';
            const gameDescription = 'Test Description';

            service.addInfo(mockMap, gameName, gameDescription);

            expect(service['gameMap']).toBe(mockMap);
            expect(service['gameName']).toBe(gameName);
            expect(service['gameDescription']).toBe(gameDescription);
        });
    });

    describe('storeId', () => {
        it('should store the game id', () => {
            const id = 'testId';
            service.storeId(id);
            expect(service['_idExistingGame']).toBe(id);
        });
    });

    describe('resetId', () => {
        it('should reset the stored game id', () => {
            service['_idExistingGame'] = 'testId';
            service.resetId();
            expect(service['_idExistingGame']).toBeUndefined();
        });
    });

    describe('addGamePrev', () => {
        it('should set the game preview image', () => {
            const img = 'test.jpg';
            service.addGamePrev(img);
            expect(service['gamePrev']).toBe(img);
        });
    });
});
