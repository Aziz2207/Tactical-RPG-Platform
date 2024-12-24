import { Game } from '@app/model/database/game';
import { GameDto } from '@app/model/dto/game/game.dto';
import { GAME_DESC_MAX_LENGTH, GAME_TITLE_MAX_LENGTH } from '@app/model/dto/game/game.dto.constants';
import { ItemDto } from '@app/model/dto/game/item.dto';
import { MapDto } from '@app/model/dto/game/map.dto';
import { TileDto } from '@app/model/dto/game/tile.dto';
import { ItemEnum } from '@common/item-enum';
import { ModeEnum } from '@common/mode-enum';
import { TileEnum } from '@common/tile-enum';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { ValidateGameService } from './validate-game.service';

describe('ValidateGameService', () => {
    let service: ValidateGameService;
    let gameModel: Model<Game>;

    beforeEach(async () => {
        gameModel = {
            find: jest.fn(),
        } as unknown as Model<Game>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: getModelToken(Game.name),
                    useValue: gameModel,
                },
                ValidateGameService,
            ],
        }).compile();

        service = module.get<ValidateGameService>(ValidateGameService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('verifyTraversable', () => {
        let validMap1: TileDto[][];
        const validMapTerrainCount1 = 12;
        let validMap2: TileDto[][];
        const validMapTerrainCount2 = 7;
        let invalidMap1: TileDto[][];
        const invalidMapTerrainCount1 = 12;
        let invalidMap2: TileDto[][];
        const invalidMapTerrainCount2 = 11;
        beforeEach(() => {
            const closedDoor: TileDto = { _tileType: TileEnum.ClosedDoor, traversable: false, imageSrc: '' };
            const grass: TileDto = { _tileType: TileEnum.Grass, traversable: true, imageSrc: '' };
            const rock: TileDto = { _tileType: TileEnum.Rock, traversable: false, imageSrc: '' };
            const water: TileDto = { _tileType: TileEnum.Water, traversable: false, imageSrc: '' };
            const ice: TileDto = { _tileType: TileEnum.Ice, traversable: true, imageSrc: '' };
            const openDoor: TileDto = { _tileType: TileEnum.OpenDoor, traversable: true, imageSrc: '' };

            // We use 4x4 maps to test for ease of testing and writing more tests
            validMap1 = [
                [grass, openDoor, grass, grass],
                [closedDoor, closedDoor, closedDoor, closedDoor],
                [closedDoor, rock, water, grass],
                [ice, grass, rock, rock],
            ];

            validMap2 = [
                [rock, rock, rock, rock],
                [grass, rock, rock, rock],
                [grass, rock, rock, grass],
                [ice, grass, grass, grass],
            ];

            invalidMap1 = [
                [grass, grass, grass, grass],
                [rock, rock, rock, rock],
                [grass, grass, grass, grass],
                [grass, grass, grass, grass],
            ];

            invalidMap2 = [
                [grass, grass, grass, grass],
                [rock, rock, rock, grass],
                [grass, rock, grass, grass],
                [grass, rock, grass, grass],
            ];
        });

        it('call with a valid map should return true', () => {
            const valid1: boolean = service.verifyConnectivity(validMap1, validMapTerrainCount1);
            const valid2: boolean = service.verifyConnectivity(validMap2, validMapTerrainCount2);
            expect(valid1).toEqual(true);
            expect(valid2).toBe(true);
        });

        it('calls with invalid maps should return false', () => {
            const invalid1: boolean = service.verifyConnectivity(invalidMap1, invalidMapTerrainCount1);
            expect(invalid1).toEqual(false);

            const invalid2: boolean = service.verifyConnectivity(invalidMap2, invalidMapTerrainCount2);
            expect(invalid2).toEqual(false);
        });
    });

    describe('verifyDoor', () => {
        const closedDoor: TileDto = { _tileType: TileEnum.ClosedDoor, traversable: false, imageSrc: '' };
        const grass: TileDto = { _tileType: TileEnum.Grass, traversable: true, imageSrc: '' };
        const rock: TileDto = { _tileType: TileEnum.Rock, traversable: false, imageSrc: '' };
        const water: TileDto = { _tileType: TileEnum.Water, traversable: false, imageSrc: '' };
        const openDoor: TileDto = { _tileType: TileEnum.OpenDoor, traversable: true, imageSrc: '' };

        it('if tile other than door is passed, reuturn true', () => {
            const error: string[] = [];
            const testMap: TileDto[][] = [[grass]];
            const valid: boolean = service.verifyDoor(0, 0, testMap, error);
            expect(valid).toEqual(true);
            expect(error).toHaveLength(0);
        });

        it('should return false if door is placed on the edge of the map', () => {
            const error: string[] = [];
            const testMap: TileDto[][] = [
                [closedDoor, grass, grass],
                [grass, grass, grass],
                [grass, grass, grass],
            ];
            const valid: boolean = service.verifyDoor(0, 0, testMap, error);
            expect(valid).toEqual(false);
            expect(error[0]).toContain('Une porte ne doit pas etre en extremité');
        });

        it('should return false if door is placed in the open', () => {
            const error: string[] = [];
            const testMap: TileDto[][] = [
                [grass, grass, grass],
                [grass, closedDoor, grass],
                [grass, grass, grass],
            ];
            const valid: boolean = service.verifyDoor(1, 1, testMap, error);
            expect(valid).toEqual(false);
            expect(error[0]).toContain('La porte doit etre connéctee aux murs et etre traversable');
        });

        it('should return false if door is placed between invalid wall arrangements', () => {
            const error: string[] = [];
            let testMap: TileDto[][] = [
                [grass, rock, grass],
                [rock, closedDoor, rock],
                [grass, rock, grass],
            ];
            let valid: boolean = service.verifyDoor(1, 1, testMap, error);
            expect(valid).toEqual(false);
            expect(error[0]).toContain('La porte doit etre connéctee aux murs et etre traversable');

            const error2: string[] = [];
            testMap = [
                [grass, rock, grass],
                [rock, closedDoor, rock],
                [grass, grass, grass],
            ];
            valid = service.verifyDoor(1, 1, testMap, error2);
            expect(valid).toEqual(false);
            expect(error2[0]).toContain('La porte doit etre connéctee aux murs et etre traversable');

            testMap = [
                [grass, water, grass],
                [rock, openDoor, rock],
                [grass, grass, grass],
            ];
            valid = service.verifyDoor(1, 1, testMap, error);
            expect(valid).toEqual(false);
            expect(error[0]).toContain('La porte doit etre connéctee aux murs et etre traversable');

            testMap = [
                [grass, grass, grass],
                [rock, closedDoor, water],
                [grass, grass, grass],
            ];
            valid = service.verifyDoor(1, 1, testMap, error);
            expect(valid).toEqual(false);
            expect(error[0]).toContain('La porte doit etre connéctee aux murs et etre traversable');
        });

        it('should return true if placement is correct', () => {
            const error: string[] = [];
            let testMap: TileDto[][] = [
                [grass, grass, grass],
                [rock, closedDoor, rock],
                [grass, grass, grass],
            ];
            let valid: boolean = service.verifyDoor(1, 1, testMap, error);
            expect(valid).toEqual(true);
            expect(error).toHaveLength(0);

            testMap = [
                [grass, rock, grass],
                [grass, openDoor, grass],
                [grass, rock, water],
            ];
            valid = service.verifyDoor(1, 1, testMap, error);
            expect(valid).toEqual(true);
            expect(error).toHaveLength(0);
        });
    });

    describe('verifyUniqueTitle', () => {
        it('if title in DB, return false', async () => {
            const mockGameDto = { title: 'Hola' } as GameDto;
            jest.spyOn(gameModel, 'find').mockResolvedValue([mockGameDto]);
            const valid = await service.verifyUniqueTitle('Hola');
            expect(valid).toEqual(false);
        });

        it('if title not in DB, return true', async () => {
            const mockGameDto = { title: 'Hola' } as GameDto;
            jest.spyOn(gameModel, 'find').mockResolvedValue([mockGameDto]);
            const valid = await service.verifyUniqueTitle('GameName');
            expect(valid).toEqual(true);
        });
    });

    describe('verifyMap', () => {
        let mockPlacedSpawnPoint: ItemDto;
        let mockUnplacedSpawnPoint: ItemDto;
        let mockGrid: TileDto[][];
        const grass: TileDto = { _tileType: TileEnum.Grass, traversable: true, imageSrc: '' };
        const openDoor: TileDto = { _tileType: TileEnum.OpenDoor, traversable: true, imageSrc: '' };
        const rock: TileDto = { _tileType: TileEnum.Rock, traversable: false, imageSrc: '' };
        let errorMessages: string[];

        beforeEach(() => {
            mockPlacedSpawnPoint = { itemType: ItemEnum.StartPoint, isOnGrid: true } as ItemDto;
            mockUnplacedSpawnPoint = { itemType: ItemEnum.StartPoint, isOnGrid: false } as ItemDto;
            mockGrid = [
                [grass, grass],
                [openDoor, grass],
            ];
            errorMessages = [];
        });

        it('should invalidate if spawn points are not all placed', () => {
            const mockMap: MapDto = { _items: [mockPlacedSpawnPoint, mockUnplacedSpawnPoint], _tiles: mockGrid, _size: 2 } as MapDto;
            const valid: boolean = service.verifyMap(mockMap, errorMessages);
            expect(valid).toEqual(false);
            expect(errorMessages).toBeDefined();
        });

        it('should return false if any doors are invalid', () => {
            const mockMap: MapDto = { _items: [mockPlacedSpawnPoint, mockPlacedSpawnPoint], _tiles: mockGrid, _size: 2 } as MapDto;
            jest.spyOn(service, 'verifyDoor').mockReturnValue(false);
            const valid = service.verifyMap(mockMap, errorMessages);
            expect(valid).toEqual(false);
        });

        it('should call verifyConnectivity with the correct number of terrain tiles and return false if invalid', () => {
            const terrainCount = 4;
            const mockMap: MapDto = { _items: [mockPlacedSpawnPoint, mockPlacedSpawnPoint], _tiles: mockGrid, _size: 2 } as MapDto;
            jest.spyOn(service, 'verifyDoor').mockReturnValue(true);
            const verifyConnectivitySpy = jest.spyOn(service, 'verifyConnectivity').mockReturnValue(false);
            const valid = service.verifyMap(mockMap, errorMessages);
            expect(verifyConnectivitySpy).toHaveBeenCalledWith(mockGrid, terrainCount);
            expect(valid).toEqual(false);
        });

        it('should return false if the amount of terrain is less than half of the grid', () => {
            const mockMap: MapDto = {
                _items: [mockPlacedSpawnPoint, mockPlacedSpawnPoint],
                _tiles: [
                    [grass, rock],
                    [rock, rock],
                ],
                _size: 2,
            } as MapDto;
            jest.spyOn(service, 'verifyDoor').mockReturnValue(true);
            const valid = service.verifyMap(mockMap, errorMessages);
            expect(valid).toEqual(false);
            expect(errorMessages).toBeDefined();
        });
    });

    describe('verify', () => {
        let mockGame: GameDto;
        beforeEach(() => {
            mockGame = { title: 'a', description: 'a', map: {} as MapDto } as GameDto;
        });

        it('Should throw error if title too long or empty', async () => {
            mockGame.title = 'a'.repeat(GAME_TITLE_MAX_LENGTH + 1);
            try {
                await service.verify(mockGame);
                fail('Should have resolved as an error');
            } catch (error) {
                expect(error).toBeTruthy();
            }

            mockGame.title = '';
            try {
                await service.verify(mockGame);
                fail('Should have resolved as an error');
            } catch (error) {
                expect(error).toBeTruthy();
            }
        });

        it('Should throw error if description too long or empty', async () => {
            mockGame.description = 'a'.repeat(GAME_DESC_MAX_LENGTH + 1);
            try {
                await service.verify(mockGame);
                fail('Should have resolved as an error');
            } catch (error) {
                expect(error).toBeTruthy();
            }

            mockGame.description = '';
            try {
                await service.verify(mockGame);
                fail('Should have resolved as an error');
            } catch (error) {
                expect(error).toBeTruthy();
            }
        });

        it('should throw error if unique title function invalidates', async () => {
            jest.spyOn(service, 'verifyUniqueTitle').mockResolvedValue(false);
            try {
                await service.verify(mockGame);
                fail('Should have resolved as an error');
            } catch (error) {
                expect(error).toBeTruthy();
            }
        });

        it('should throw error if verify map function invalidates', async () => {
            jest.spyOn(service, 'verifyUniqueTitle').mockResolvedValue(true);
            jest.spyOn(service, 'verifyMap').mockReturnValue(false);
            try {
                await service.verify(mockGame);
                fail('Should have resolved as an error');
            } catch (error) {
                expect(error).toBeTruthy();
            }
        });

        it('should return true if all conditions are met', async () => {
            jest.spyOn(service, 'verifyUniqueTitle').mockResolvedValue(true);
            jest.spyOn(service, 'verifyMap').mockReturnValue(true);
            try {
                const valid = await service.verify(mockGame);
                expect(valid).toEqual(true);
            } catch (error) {
                fail('Should not have thrown error');
            }
        });
    });

    describe('verifyWithoutTitle', () => {
        let mockGame: GameDto;

        beforeEach(() => {
            mockGame = {
                title: 'Valid Game',
                description: 'A valid game description',
                map: {} as MapDto,
            } as GameDto;
        });

        it('should return true if the map is valid', async () => {
            jest.spyOn(service, 'verifyMap').mockReturnValue(true);
            const isValid = await service.verifyWithoutTitle(mockGame);
            expect(isValid).toBe(true);
        });
    });

    describe('verifyMap - Flag placement', () => {
        let mockMap: MapDto;
        let errorMessages: string[];

        beforeEach(() => {
            mockMap = {
                _items: [],
                _tiles: [[]],
                _size: 10,
                mode: ModeEnum.CTF,
            } as MapDto;
            errorMessages = [];
        });

        it('should invalidate if flag is not placed on the grid in CTF mode', () => {
            mockMap._items.push({ itemType: ItemEnum.Flag, isOnGrid: false } as ItemDto);
            const isValid = service.verifyMap(mockMap, errorMessages);
            expect(isValid).toBe(false);
            expect(errorMessages).toContain('Le drapeau doit etre sur la carte.');
        });
    });

    describe('verifyTileProperties', () => {
        const mockErrorMessages: string[] = [];
        const grassTile: TileDto = { _tileType: TileEnum.Grass, traversable: true, imageSrc: 'assets/grass.jpeg' };

        it('should return false if the tile type is unknown', () => {
            const invalidTile = { _tileType: 'UnknownType', traversable: true, imageSrc: '' } as unknown as TileDto;

            const mockErrorMessages: string[] = [];
            const isValid = service.verifyTileProperties(invalidTile, 0, 0, mockErrorMessages);
            expect(isValid).toBe(false);
            expect(mockErrorMessages).toContain('Tuile invalide à la position (0, 0): type de tuile inconnu.');
        });

        it('should return false if traversable property is incorrect', () => {
            const invalidTile = { ...grassTile, traversable: false };
            const isValid = service.verifyTileProperties(invalidTile, 1, 1, mockErrorMessages);
            expect(isValid).toBe(false);
            expect(mockErrorMessages).toContain("La tuile à la position (1, 1) de type grass a une propriété 'traversable' incorrecte.");
        });

        it('should return false if imageSrc property is incorrect', () => {
            const invalidTile = { ...grassTile, imageSrc: 'assets/wrong.jpeg' };
            const isValid = service.verifyTileProperties(invalidTile, 2, 2, mockErrorMessages);
            expect(isValid).toBe(false);
            expect(mockErrorMessages).toContain("La tuile à la position (2, 2) de type grass a une propriété 'imageSrc' incorrecte.");
        });

        it('should return true for a valid tile', () => {
            const grassTile = {
                _tileType: TileEnum.Grass,
                traversable: true,
                imageSrc: 'assets/grass.jpeg',
            } as TileDto;

            const mockErrorMessages: string[] = [];
            const isValid = service.verifyTileProperties(grassTile, 3, 3, mockErrorMessages);
            expect(isValid).toBe(true);
            expect(mockErrorMessages.length).toBe(0);
        });
    });
});
