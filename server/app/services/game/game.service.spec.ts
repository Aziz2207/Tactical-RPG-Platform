import { Game } from '@app/model/database/game';
import { GameDto } from '@app/model/dto/game/game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { DateService } from '@app/services/date/date.service';
import { ValidateGameService } from '@app/services/validate-game/validate-game.service';
import { ItemEnum } from '@common/item-enum';
import { TileEnum } from '@common/tile-enum';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { GameService } from './game.service';

/**
 * There is two way to test the service :
 * - Mock the mongoose Model implementation and do what ever we want to do with it (see describe CourseService) or
 * - Use mongodb memory server implementation (see describe CourseServiceEndToEnd) and let everything go through as if we had a real database
 *
 * The second method is generally better because it tests the database queries too.
 * We will use it more
 */

describe('GameService', () => {
    let service: GameService;
    let validateService: ValidateGameService;
    let gameModel: Model<Game>;
    let dateService: DateService;

    beforeEach(async () => {
        gameModel = {
            countDocuments: jest.fn(),
            insertMany: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            deleteOne: jest.fn(),
            update: jest.fn(),
            updateOne: jest.fn(),
            replaceOne: jest.fn(),
            findById: jest.fn(),
        } as unknown as Model<Game>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameService,
                Logger,
                {
                    provide: getModelToken(Game.name),
                    useValue: gameModel,
                },
                DateService,
                ValidateGameService,
            ],
        }).compile();

        service = module.get<GameService>(GameService);
        validateService = module.get<ValidateGameService>(ValidateGameService);
        dateService = module.get<DateService>(DateService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getGames', () => {
        it('should call find with an empty query', async () => {
            const findSpy = jest.spyOn(gameModel, 'find');
            await service.getGames();
            expect(findSpy).toHaveBeenCalledWith({});
        });
        it('should be able to handle errors', async () => {
            const errorTest = new Error('error test');
            jest.spyOn(gameModel, 'find').mockRejectedValue(errorTest);
            service
                .getGames()
                .then(() => fail('error was not thrown'))
                .catch((error) => {
                    expect(error).toEqual(`Failed to get games: ${errorTest}`);
                });
        });
    });

    describe('getGame', () => {
        it('should call findOne', async () => {
            const mockGame = {
                title: 'Game One',
                mode: 'CTF',
                size: 10,
                isVisible: true,
                description: 'descriptor of the game 3',
                lastMod: '2024/09/21',
                _id: '12345',
            };
            const findOneSpy = jest.spyOn(gameModel, 'findOne');
            await service.getGame(mockGame._id);
            await service.getGame(mockGame._id);
            expect(findOneSpy).toHaveBeenCalledWith({ _id: mockGame._id });
        });

        it('should be able to handle errors', async () => {
            const mockError = new Error('test error');
            const mockId = 'abcdef';
            jest.spyOn(gameModel, 'findOne').mockRejectedValue(mockError);
            await service
                .getGame(mockId)
                .then(() => {
                    fail('error should have been thrown');
                })
                .catch((error) => {
                    expect(error).toEqual(`Failed to get game of id ${mockId} : ${mockError}`);
                });
        });
    });

    describe('putGame', () => {
        let mockGameNoId: GameDto;
        let mockGameId: GameDto;
        let createSpy;
        let replaceOneSpy;
        let validateSpy;
        let currentTimeSpy;

        beforeEach(() => {
            mockGameNoId = {
                title: 'Game One',
                lastMod: '2024/09/21',
                description: 'descriptor of the game 3',
                isVisible: false,
                size: 10,
                map: {
                    _tiles: [[{ _tileType: TileEnum.Grass, traversable: true, imageSrc: 'fakeSrc' }]],
                    _size: 10,
                    mode: 'CTF',
                    _items: [
                        {
                            itemType: ItemEnum.ABomb,
                            imgSrc: 'fakeImg',
                            isRandom: false,
                            id: 2,
                            isOnGrid: true,
                            description: 'fakeDescription',
                            hasEffect: true,
                        },
                    ],
                },
            };
            mockGameId = {
                title: 'Game One',
                description: 'descriptor of the game 3',
                isVisible: false,
                _id: 'abcdef',
                size: 10,
                map: {
                    _tiles: [[{ _tileType: TileEnum.Grass, traversable: true, imageSrc: 'fakeSrc' }]],
                    _size: 10,
                    mode: 'CTF',
                    _items: [
                        {
                            itemType: ItemEnum.ABomb,
                            imgSrc: 'fakeImg',
                            isRandom: false,
                            id: 2,
                            isOnGrid: true,

                            description: 'fakeDescription',
                            hasEffect: true,
                        },
                    ],
                },
            };

            createSpy = jest.spyOn(gameModel, 'create');
            validateSpy = jest.spyOn(validateService, 'verify').mockResolvedValue(true);
            replaceOneSpy = jest.spyOn(gameModel, 'replaceOne');
            currentTimeSpy = jest.spyOn(dateService, 'currentTime');
        });

        it('should call create if the game has no Id and is validated', async () => {
            const fakeDate = '1999/6/21';
            const expectedCall = { ...mockGameNoId, lastMod: fakeDate };

            validateSpy = jest.spyOn(validateService, 'verify').mockResolvedValue(true);
            jest.spyOn(dateService, 'currentTime').mockReturnValue(fakeDate);

            await service.putGame(mockGameNoId);

            expect(validateSpy).toHaveBeenCalled();
            expect(createSpy).toHaveBeenCalledWith(expectedCall);
        });

        it('should call replaceOne if game has id and is validated', async () => {
            const fakeDate = '1999/6/21';
            const expectedCallGame = { ...mockGameId, lastMod: fakeDate };

            currentTimeSpy.mockReturnValue(fakeDate);
            const findByIdSpy = jest.spyOn(gameModel, 'findById');

            await service.putGame(mockGameId);

            expect(validateSpy).toHaveBeenCalled();
            expect(replaceOneSpy).toHaveBeenCalledWith({ _id: mockGameId._id }, expectedCallGame);
            expect(findByIdSpy).toHaveBeenCalledWith({ _id: mockGameId._id });
        });

        it('should be able to handle errors', () => {
            const mockError = new Error('test error');

            createSpy.mockRejectedValue(mockError);
            replaceOneSpy.mockRejectedValue(mockError);

            service
                .putGame(mockGameId)
                .then(() => {
                    fail('error should have been thrown');
                })
                .catch((error) => {
                    expect(error).toBeDefined();
                });

            service
                .putGame(mockGameNoId)
                .then(() => {
                    fail('error should have been thrown');
                })
                .catch((error) => {
                    expect(error).toBeDefined();
                });
        });

        it('putGame should throw an error if validate service invalidates the game', () => {
            validateSpy.mockReturnValue(false);
            service
                .putGame(mockGameId)
                .then(() => {
                    fail('error should have been thrown');
                })
                .catch((error) => {
                    expect(error).toBeDefined();
                });
        });
    });

    describe('deleteGame', () => {
        let deleteOneSpy;
        let mockId: string;

        beforeEach(() => {
            deleteOneSpy = jest.spyOn(gameModel, 'deleteOne');
            mockId = 'abcdef';
        });

        it('should call deleteOne not throw error if game is found', () => {
            deleteOneSpy.mockResolvedValue({ acknowledged: true, deletedCount: 1 });
            service.deleteGame(mockId).catch(() => fail('no errors should occur'));
            expect(deleteOneSpy).toHaveBeenCalledWith({ _id: mockId });
        });

        it('should call deleteOne and throw an error if game is not found', () => {
            deleteOneSpy.mockResolvedValue({ acknowledged: true, deletedCount: 0 });

            service
                .deleteGame(mockId)
                .then(() => {
                    fail('error should be thrown');
                })
                .catch((error) => {
                    expect(error).toBeDefined();
                });

            expect(deleteOneSpy).toHaveBeenCalledWith({ _id: mockId });
        });
    });

    describe('patchGame', () => {
        let updateOneSpy;
        let findByIdSpy;
        let currentTimeSpy;
        let mockUpdateInfo: UpdateGameDto;
        let mockId: string;
        const mockDate = '1999/6/21';

        beforeEach(() => {
            updateOneSpy = jest.spyOn(gameModel, 'updateOne');
            findByIdSpy = jest.spyOn(gameModel, 'findById');

            mockUpdateInfo = {
                isVisible: false,
            };
            mockId = 'abcdef';
            currentTimeSpy = jest.spyOn(dateService, 'currentTime').mockReturnValue(mockDate);
        });

        it('should call patch game and findById if game is found', async () => {
            updateOneSpy.mockResolvedValue({ modifiedCount: 1 });

            await service.patchGame(mockId, mockUpdateInfo);

            expect(updateOneSpy).toHaveBeenCalledWith({ _id: mockId }, { ...mockUpdateInfo, lastMod: mockDate });
            expect(findByIdSpy).toHaveBeenCalledWith({ _id: mockId });
            expect(currentTimeSpy).toHaveBeenCalled();
        });

        it('should thow error if game not found in DB', async () => {
            updateOneSpy.mockResolvedValue({ modifiedCount: 0 });

            try {
                await service.patchGame(mockId, mockUpdateInfo);
                fail('error should have been called');
            } catch (error) {
                expect(error).toBeDefined();
            }
            expect(findByIdSpy).not.toHaveBeenCalled();
        });
    });

    describe('findGameByTitle', () => {
        const mockTitle = 'Test Game';
        it('should call findOne with the correct title and return the game', async () => {
            const mockGame = {
                title: mockTitle,
                _id: '123',
                isVisible: true,
            } as Game;
            jest.spyOn(gameModel, 'findOne').mockResolvedValue(mockGame);
            const result = await service.findGameByTitle(mockTitle);
            expect(gameModel.findOne).toHaveBeenCalledWith({ title: mockTitle });
            expect(result).toEqual(mockGame);
        });
        it('should call findOne and return null if no game is found', async () => {
            jest.spyOn(gameModel, 'findOne').mockResolvedValue(null);
            const result = await service.findGameByTitle(mockTitle);
            expect(gameModel.findOne).toHaveBeenCalledWith({ title: mockTitle });
            expect(result).toBeNull();
        });
        it('should throw an error if the query fails', async () => {
            const mockError = new Error('Database query failed');
            jest.spyOn(gameModel, 'findOne').mockRejectedValue(mockError);
            await expect(service.findGameByTitle(mockTitle)).rejects.toThrowError(`Failed to find the game : ${mockError.message}`);
        });
    });
});

