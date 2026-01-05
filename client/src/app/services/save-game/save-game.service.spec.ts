import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
    ErrorMessages,
    NB_ITEMS_LARGE_MAP,
    NB_ITEMS_MEDIUM_MAP,
    NB_ITEMS_SMALL_MAP,
    SIZE_LARGE_MAP,
    SIZE_MEDIUM_MAP,
    SIZE_SMALL_MAP,
    TEST_INVALID_SIZE,
} from '@app/constants';
import { Info } from '@app/interfaces/info';
import { dummyInfo, dummyMap } from '@app/mocks/mock-map';
import { GameImportValidatorService } from '@app/services/game-import-validor/game-import-validator.service';
import { GameMode } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { of } from 'rxjs';
import { SaveGameService } from './save-game.service';

describe('SaveGameService', () => {
    let service: SaveGameService;
    let httpMock: HttpTestingController;
    let dummyInfoCopy: Info;
    let gameImportValidatorServiceSpy: jasmine.SpyObj<GameImportValidatorService>;
    const dummyGame: Game = {
        _id: 'Test ID',
        name: 'Test Game',
        description: 'Test Description',
        image: 'Test Image',
        tiles: [
            [0, 0],
            [0, 0],
        ],
        itemPlacement: [
            [0, 0],
            [0, 0],
        ],
        dimension: 10,
        nbPlayers: 2,
        mode: GameMode.Classic,
        isSelected: false,
        lastModification: new Date(),
    };

    beforeEach(async () => {
        dummyInfoCopy = JSON.parse(JSON.stringify(dummyInfo));
        gameImportValidatorServiceSpy = jasmine.createSpyObj('GameImportValidatorService', ['validateMap']);

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: GameImportValidatorService, useValue: gameImportValidatorServiceSpy },
            ],
        });
        httpMock = TestBed.inject(HttpTestingController);
        service = TestBed.inject(SaveGameService);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should create a POST request if the selected game is null', () => {
        dummyInfoCopy.height = SIZE_MEDIUM_MAP;
        const infos = JSON.parse(JSON.stringify(dummyInfo));
        service.saveNewGame(infos);

        const request = httpMock.expectOne(`${service.apiURL}`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({
            name: infos.name,
            description: infos.description,
            visible: false,
            mode: 'classique',
            nbPlayers: NB_ITEMS_MEDIUM_MAP,
            image: infos.image,
            tiles: infos.grid,
            dimension: dummyMap.dimension,
            itemPlacement: infos.items,
            isSelected: false,
            lastModification: jasmine.any(Date),
        });
    });

    it('should create a PUT request', () => {
        dummyInfoCopy.height = SIZE_MEDIUM_MAP;
        service.replaceMap(dummyInfoCopy, 'id');
        const request = httpMock.expectOne(`${service.apiURL}`);
        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual({
            _id: 'id',
            name: dummyInfoCopy.name,
            description: dummyInfoCopy.description,
            visible: false,
            mode: GameMode.Classic,
            nbPlayers: NB_ITEMS_MEDIUM_MAP,
            image: dummyInfoCopy.image,
            tiles: dummyInfoCopy.grid,
            dimension: dummyMap.dimension,
            itemPlacement: dummyInfoCopy.items,
            isSelected: false,
            lastModification: jasmine.any(Date),
        });
    });

    it('should throw an error if the height is not valid', () => {
        expect(function () {
            // This comment is to be able to test private methods
            // @ts-ignore
            service.getPlayerNumber(TEST_INVALID_SIZE);
        }).toThrow(new Error('Taille de carte invalide'));
    });

    it('should have the correct number of players', () => {
        dummyInfoCopy.height = SIZE_SMALL_MAP;
        service.saveNewGame(dummyInfoCopy);
        const request = httpMock.expectOne(`${service.apiURL}`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body.nbPlayers).toEqual(NB_ITEMS_SMALL_MAP);

        dummyInfoCopy.height = SIZE_LARGE_MAP;
        service.saveNewGame(dummyInfoCopy);
        const secondRequest = httpMock.expectOne(`${service.apiURL}`);
        expect(secondRequest.request.method).toBe('POST');
        expect(secondRequest.request.body.nbPlayers).toEqual(NB_ITEMS_LARGE_MAP);
    });

    it('should transform Game to Info in cleanData', () => {
        const result = service.cleanData(dummyGame);

        expect(result).toEqual({
            name: dummyGame.name,
            description: dummyGame.description,
            image: dummyGame.image,
            grid: dummyGame.tiles,
            items: dummyGame.itemPlacement,
            height: dummyGame.dimension,
            mode: dummyGame.mode,
        });
    });

    it('should handle valid name existence in isNameAlreadyExists', (done) => {
        const dummyGames: Game[] = [
            {
                _id: 'Test ID',
                name: 'Existing Name',
                description: '',
                image: '',
                tiles: [],
                itemPlacement: [],
                dimension: SIZE_MEDIUM_MAP,
                nbPlayers: 4,
                mode: GameMode.Classic,
                isSelected: false,
                lastModification: new Date(),
            },
        ];

        service.isNameAlreadyExists('Existing Name').subscribe((exists) => {
            expect(exists).toBeTrue();
            done();
        });

        const req = httpMock.expectOne(`${service.apiURL}`);
        req.flush(dummyGames);
    });

    it('should handle valid name non-existence in isNameAlreadyExists', (done) => {
        const dummyGames: Game[] = [
            {
                _id: 'Test ID',
                name: 'Other Name',
                description: '',
                image: '',
                tiles: [],
                itemPlacement: [],
                dimension: SIZE_MEDIUM_MAP,
                nbPlayers: 4,
                mode: GameMode.Classic,
                isSelected: false,
                lastModification: new Date(),
            },
        ];

        service.isNameAlreadyExists('Non-Existent Name').subscribe((exists) => {
            expect(exists).toBeFalse();
            done();
        });

        const req = httpMock.expectOne(`${service.apiURL}`);
        req.flush(dummyGames);
    });

    it('should handle existing name error in saveImportedGameWithNewName', (done) => {
        const existingName = 'Existing Game';

        service.gameInfoImported = {
            name: 'Test Game',
            description: 'Test Description',
            image: 'Test Image',
            grid: [
                [0, 0],
                [0, 0],
            ],
            items: [
                [0, 0],
                [0, 0],
            ],
            height: SIZE_MEDIUM_MAP,
            mode: GameMode.Classic,
        };

        spyOn(service, 'isNameAlreadyExists').and.returnValue(of(true));

        service.saveImportedGameWithNewName(existingName).subscribe({
            error: (error) => {
                expect(error.message).toBe(ErrorMessages.NameAlreadyExists);
                done();
            },
        });
    });

    it('should handle invalid name length in saveImportedGameWithNewName', (done) => {
        const invalidName = 'A';

        spyOn(service, 'isNameAlreadyExists').and.returnValue(of(false));

        service.saveImportedGameWithNewName(invalidName).subscribe({
            error: (error) => {
                expect(error.message).toBe(ErrorMessages.TitleInvalidLength);
                done();
            },
        });
    });

    it('should save game with valid new name in saveImportedGameWithNewName', (done) => {
        const newName = 'Valid Game Name';

        service.gameInfoImported = {
            name: 'Test Game',
            description: 'Test Description',
            image: 'Test Image',
            grid: [
                [0, 0],
                [0, 0],
            ],
            items: [
                [0, 0],
                [0, 0],
            ],
            height: SIZE_MEDIUM_MAP,
            mode: GameMode.Classic,
        };

        spyOn(service, 'isNameAlreadyExists').and.returnValue(of(false));

        service.saveImportedGameWithNewName(newName).subscribe((response) => {
            expect(response).toEqual({});
            done();
        });

        const req = httpMock.expectOne(`${service.apiURL}`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body.name).toBe(newName);
        req.flush({});
    });

    it('should create a POST request in saveImportedGame', () => {
        service.saveImportedGame(dummyInfoCopy).subscribe();

        const req = httpMock.expectOne(`${service.apiURL}`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            name: dummyInfoCopy.name,
            description: dummyInfoCopy.description,
            visible: false,
            mode: GameMode.Classic,
            nbPlayers: NB_ITEMS_MEDIUM_MAP,
            image: dummyInfoCopy.image,
            tiles: dummyInfoCopy.grid,
            dimension: dummyInfoCopy.height,
            itemPlacement: dummyInfoCopy.items,
            isSelected: false,
            lastModification: jasmine.any(Date),
        });

        req.flush({});
    });

    it('should handle successful game import', (done) => {
        const fileContent = JSON.stringify(dummyGame);
        const file = new File([fileContent], 'test.json', { type: 'application/json' });

        gameImportValidatorServiceSpy.validateMap.and.callFake(async () => new Promise((resolve) => resolve([])));

        const saveImportedGameSpy = spyOn(service, 'saveImportedGame').and.callFake(() => of(dummyGame));

        service.importGame(file).subscribe((result) => {
            expect(result).toEqual(dummyGame);
            expect(saveImportedGameSpy).toHaveBeenCalled();
            done();
        });
    });

    it('should handle invalid game import', (done) => {
        const fileContent = JSON.stringify(dummyGame);
        const file = new File([fileContent], 'test.json', { type: 'application/json' });

        gameImportValidatorServiceSpy.validateMap.and.callFake(async () => new Promise((resolve) => resolve([ErrorMessages.InvalidMode])));

        const saveImportedGameSpy = spyOn(service, 'saveImportedGame');

        service.importGame(file).subscribe((result) => {
            expect(result).toContain(ErrorMessages.InvalidMode);
            expect(saveImportedGameSpy).not.toHaveBeenCalled();
            done();
        });
    });

    it('should handle wrong file type during import', (done) => {
        const fileContent = 'This is not JSON content';
        const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

        service.importGame(file).subscribe({
            error: (error) => {
                expect(error).toEqual([ErrorMessages.InvalidFile]);
                done();
            },
        });
    });
});
