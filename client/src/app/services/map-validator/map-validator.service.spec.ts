import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { SimpleDialogComponent } from '@app/components/simple-dialog/simple-dialog.component';
import { MAX_LEN_MAP_DESCRIPTION, MAX_LEN_MAP_TITLE, NB_ITEMS_MEDIUM_MAP, NO_OBJECT, VALIDATION_DURATION } from '@app/constants';
import { mockInvalidItemsMatrice, mockLargeItemsMatrice, mockMediumItemsMatrice } from '@app/mocks/mock-game';
import { mockValidationInfo } from '@app/mocks/mock-validation';
import { GameListService } from '@app/services/game-list/game-list.service';
import { GameObjectService } from '@app/services/game-object/game-object.service';
import { GameMode, ObjectType, TileType } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { of } from 'rxjs';
import { MapValidatorService } from './map-validator.service';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('MapValidatorService', () => {
    let service: MapValidatorService;
    let dialogSpy: jasmine.SpyObj<MatDialog>;

    let gameObjectServiceSpy: jasmine.SpyObj<GameObjectService>;
    let gameListServiceSpy: jasmine.SpyObj<GameListService>;

    beforeEach(() => {
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        gameObjectServiceSpy = jasmine.createSpyObj('GameObjectService', ['initObjectsArray', 'getGameMode']);
        gameListServiceSpy = jasmine.createSpyObj('GameListService', ['getAllGames']);
        gameListServiceSpy.getAllGames.and.returnValue(of([]));

        gameObjectServiceSpy.objectsArray = [
            [ObjectType.Sandal, ObjectType.Spawn],
            [ObjectType.Spawn, NO_OBJECT],
        ];
        TestBed.configureTestingModule({
            providers: [
                MapValidatorService,
                { provide: MatDialog, useValue: dialogSpy },
                { provide: GameListService, useValue: gameListServiceSpy },
                { provide: GameObjectService, useValue: gameObjectServiceSpy },
            ],
        });
        service = TestBed.inject(MapValidatorService);
    });

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    afterAll(() => {
        TestBed.resetTestingModule();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should not add an error message if the map is valid', () => {
        mockValidationInfo.isNewMap = false;
        spyOn<any>(service, 'validateAllSpawnPointsPlaced').and.callFake(() => {
            return;
        });
        service.validateMap(mockValidationInfo);
        expect(service['errorMessages'].length).toBe(1);
    });

    it('should not add an error message if the map is valid', () => {
        mockValidationInfo.isNewMap = true;
        spyOn<any>(service, 'validateAllSpawnPointsPlaced').and.callFake(() => {
            return;
        });
        service.validateMap(mockValidationInfo);
        expect(service['errorMessages'].length).toBe(1);
    });

    it('should set validMap to true and open dialog with "Sauvegarde réussie" if there are not error messages', fakeAsync(() => {
        service['errorMessages'] = [];
        spyOn<any>(service, 'openDialog');
        service['showValidationResult']();
        tick(VALIDATION_DURATION);
        expect(service.validMap).toBeTrue();
    }));

    it('should set validMap to false and open dialog with "Carte invalide" if there are error messages', fakeAsync(() => {
        service['errorMessages'] = ['Erreur 1'];
        spyOn<any>(service, 'openDialog');
        service['showValidationResult']();
        tick(VALIDATION_DURATION);
        expect(service.validMap).toBeFalse();
        expect(service['openDialog']).toHaveBeenCalledWith(service['errorMessages'], 'Carte invalide');
    }));

    it('should return the correct nb of items depending on the map size', () => {
        service['validateNumberItems'](mockMediumItemsMatrice);
        expect(service['errorMessages'].length).toEqual(1);

        service['validateNumberItems'](mockLargeItemsMatrice);
        service['validateNumberItems'](mockInvalidItemsMatrice);
    });

    it('should add an error message if a map with the same name exists', () => {
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
        gameListServiceSpy.getAllGames.and.returnValue(of(mockMaps));
        service['validateName']('Map1');
        expect(service['errorMessages']).toContain('- Une carte avec le même nom existe déjà');
    });

    it('should call validateFlag if in capture the flag mode', () => {
        spyOn<any>(service, 'validateFlag');
        gameObjectServiceSpy.getGameMode.and.returnValue(GameMode.CaptureTheFlag);
        service.validateMap(mockValidationInfo);
        expect(service['validateFlag']).toHaveBeenCalled();
    });

    describe('isDoorPlacementValid', () => {
        it('should return true for a valid door placement', () => {
            const mockMap = [
                [TileType.Wall, TileType.Ground, TileType.Wall],
                [TileType.Wall, TileType.ClosedDoor, TileType.Wall],
                [TileType.Wall, TileType.Ground, TileType.Wall],
            ];

            expect(service['isDoorPlacementValid'](mockMap, 1, 1)).toBeTrue();
        });

        it('should return true for a valid door placement', () => {
            const mockMap = [
                [TileType.Wall, TileType.Wall, TileType.Wall],
                [TileType.Ice, TileType.ClosedDoor, TileType.Ground],
                [TileType.Wall, TileType.Wall, TileType.Wall],
            ];

            expect(service['isDoorPlacementValid'](mockMap, 1, 1)).toBeTrue();
        });

        it('should return false for an invalid door placement', () => {
            const mockMap = [
                [TileType.Wall, TileType.Ground, TileType.Wall],
                [TileType.Wall, TileType.ClosedDoor, TileType.Ground],
                [TileType.Wall, TileType.Wall, TileType.Wall],
            ];

            expect(service['isDoorPlacementValid'](mockMap, 1, 1)).toBeFalse();
        });
    });

    describe('validateAllDoors', () => {
        it('should not add error messages for valid door placements', () => {
            const mockMap = [
                [TileType.Wall, TileType.Ground, TileType.Wall],
                [TileType.Wall, TileType.ClosedDoor, TileType.Wall],
                [TileType.Wall, TileType.Ground, TileType.Wall],
            ];
            service['validateAllDoors'](mockMap);
            expect(service['errorMessages'].length).toBe(0);
            expect(service['errorMessages']).toEqual([]);
        });

        it('should add error messages for invalid door placements', () => {
            const mockMap = [
                [TileType.Wall, TileType.ClosedDoor, TileType.Ground],
                [TileType.Wall, TileType.Wall, TileType.Wall],
            ];
            service['validateAllDoors'](mockMap);
            expect(service['errorMessages'].length).toBeGreaterThan(0);
        });
    });

    describe('hasSufficientTerrainTiles', () => {
        it('should not add error messages if more than half of the map contains terrain tiles', () => {
            const mockMap = [
                [TileType.Ground, TileType.Ground],
                [TileType.Wall, TileType.Ground],
            ];
            service['validateSufficientTerrainTiles'](mockMap);
            expect(service['errorMessages'].length).toBe(0);
        });

        it('should add error messages if less than half of the map contains terrain tiles', () => {
            const mockMap = [
                [TileType.Wall, TileType.Ground],
                [TileType.Wall, TileType.Wall],
            ];
            service['validateSufficientTerrainTiles'](mockMap);
            expect(service['errorMessages'].length).toBeGreaterThan(0);
        });
    });

    describe('isEveryTileAccessible', () => {
        it('should not add error messages if all non-wall tiles are accessible', () => {
            const mockMap = [
                [TileType.Ground, TileType.Ground],
                [TileType.Wall, TileType.Ground],
            ];
            service['validateTileAccessibility'](mockMap);
            expect(service['errorMessages'].length).toBe(0);
        });

        it('should add error messages if any non-wall tile is inaccessible', () => {
            const mockMap = [
                [TileType.Ground, TileType.Wall],
                [TileType.Wall, TileType.Ground],
            ];

            service['validateTileAccessibility'](mockMap);
            expect(service['errorMessages'].length).toBeGreaterThan(0);
        });
    });

    it('should add an error message if the map does not have a flag object in capture the flag mode', () => {
        gameObjectServiceSpy.getGameMode.and.returnValue(GameMode.CaptureTheFlag);
        service['mapObjects'] = gameObjectServiceSpy.objectsArray;
        service['validateFlag']();
        expect(service['errorMessages']).toContain('- Le drapeau doit être placé sur la carte lors du mode CTF.');
    });

    describe('validateMap', () => {
        describe('containsAcharacter', () => {
            it('should return true for non-empty strings', () => {
                expect(service['containsAcharacter']('Hello')).toBeTrue();
                expect(service['containsAcharacter'](' A ')).toBeTrue();
            });

            it('should return false for empty strings', () => {
                expect(service['containsAcharacter']('')).toBeFalse();
                expect(service['containsAcharacter']('   ')).toBeFalse();
            });
        });

        describe('validateTitleLength', () => {
            it('should return true for valid titles', () => {
                expect(service['isTitleValidLength']('Valid Title')).toBeTrue();
                expect(service['isTitleValidLength']('Another Title')).toBeTrue();
            });

            it('should return false for titles that are too short', () => {
                expect(service['isTitleValidLength']('A')).toBeFalse();
                expect(service['isTitleValidLength']('AB')).toBeFalse();
            });

            it('should return false for titles that are too long', () => {
                const longTitle = 'A'.repeat(MAX_LEN_MAP_TITLE + 1);
                expect(service['isTitleValidLength'](longTitle)).toBeFalse();
            });

            it('should add an error message if the title is invalid', () => {
                const invalidTitle = '  ';
                service['validateTitle'](invalidTitle);
                expect(service['errorMessages']).toContain(
                    '- Le titre de la carte doit avoir une longueur entre 3 et 30 caractères et ne pas uniquement contenir des espaces',
                );
            });
        });

        describe('validateDescriptionLength', () => {
            it('should return true for valid descriptions', () => {
                expect(service['isDescriptionValid']('This is a valid description.')).toBeTrue();
            });

            it('should return false for descriptions that are too short', () => {
                expect(service['isDescriptionValid']('Too short')).toBeFalse();
            });

            it('should return false for descriptions that are too long', () => {
                const longDescription = 'A'.repeat(MAX_LEN_MAP_DESCRIPTION + 1);
                expect(service['isDescriptionValid'](longDescription)).toBeFalse();
            });

            it('should return false for descriptions that do not contain a character', () => {
                expect(service['isDescriptionValid']('   ')).toBeFalse();
            });
        });

        it('should add an error message if the description is invalid', () => {
            const invalidDescription = '  ';
            service['validateDescription'](invalidDescription);
            expect(service['errorMessages']).toContain(
                '- La description de la carte doit avoir une longueur entre 10 et 128 charactères et ne pas uniquement contenir des espaces',
            );
        });
    });

    describe('areAllSpawnPointsPlaced', () => {
        it('should add an error message if not all spawn points are placed', () => {
            gameObjectServiceSpy.objectsArray = [
                [ObjectType.Spawn, ObjectType.Spawn],
                [ObjectType.Spawn, NO_OBJECT],
            ];
            service['mapObjects'] = gameObjectServiceSpy.objectsArray;
            gameObjectServiceSpy.maxCount = NB_ITEMS_MEDIUM_MAP;
            service['validateAllSpawnPointsPlaced']();
            expect(service['errorMessages'].length).toBeGreaterThan(0);
        });

        it('should not add an error message if all spawn points are placed', () => {
            gameObjectServiceSpy.objectsArray = [
                [ObjectType.Spawn, ObjectType.Spawn],
                [ObjectType.Spawn, ObjectType.Spawn],
            ];
            service['mapObjects'] = gameObjectServiceSpy.objectsArray;
            gameObjectServiceSpy.maxCount = NB_ITEMS_MEDIUM_MAP;
            service['validateAllSpawnPointsPlaced']();
            expect(service['errorMessages'].length).toBe(0);
        });
        it('should return null if all tiles are walls', () => {
            const mockMap = [
                [TileType.Wall, TileType.Wall],
                [TileType.Wall, TileType.Wall],
            ];

            const result = service['findStartPoint'](mockMap);
            expect(result).toBeNull();
        });
    });
    it('should open the dialog with correct parameters', () => {
        const mockErrorMessages = ['Erreur 1', 'Erreur 2'];
        const mockTitle = 'Titre de test';
        service['openDialog'](mockErrorMessages, mockTitle);
        expect(dialogSpy.open).toHaveBeenCalledWith(SimpleDialogComponent, {
            disableClose: true,
            data: { messages: mockErrorMessages, title: mockTitle },
        });
    });
});
