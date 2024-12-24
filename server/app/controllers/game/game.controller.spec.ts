import { Game, GameDocument } from '@app/model/database/game';
import { GameDto } from '@app/model/dto/game/game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { GameService } from '@app/services/game/game.service';
import { ValidateGameService } from '@app/services/validate-game/validate-game.service';
import { Map } from '@common/interfaces/map';
import { ModeEnum } from '@common/mode-enum';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { createStubInstance, SinonStubbedInstance } from 'sinon';
import { GameController } from './game.controller';

describe('GameController', () => {
    let controller: GameController;
    let gameService: SinonStubbedInstance<GameService>;
    let validateGameService: SinonStubbedInstance<ValidateGameService>;

    beforeEach(async () => {
        gameService = createStubInstance(GameService);
        validateGameService = createStubInstance(ValidateGameService);
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GameController],
            providers: [
                {
                    provide: GameService,
                    useValue: gameService,
                },
                {
                    provide: ValidateGameService,
                    useValue: validateGameService,
                },
            ],
        }).compile();

        controller = module.get<GameController>(GameController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('getGames() should return all games', async () => {
        const fakeGames = [{} as Game, {} as Game];
        gameService.getGames.resolves(fakeGames);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.json = (courses) => {
            expect(courses).toEqual(fakeGames);
            return res;
        };

        await controller.getGames(res);
    });

    it('getGames() should return NOT_FOUND when service unable to fetch games', async () => {
        gameService.getGames.rejects();

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;

        await controller.getGames(res);
    });

    it('getGameById() should return the correct game', async () => {
        const fakeGame = new Game();
        gameService.getGame.resolves(fakeGame);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.json = (courses) => {
            expect(courses).toEqual(fakeGame);
            return res;
        };

        await controller.getGameById('', res);
    });

    it('GetGameById() should return NOT_FOUND when service unable to fetch the game', async () => {
        gameService.getGame.rejects();

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;

        await controller.getGameById('', res);
    });

    it('addGame() should succeed if service able to add the game', async () => {
        const fakeGame = { _id: '123' } as unknown as GameDocument;
        gameService.putGame.resolves(fakeGame);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.CREATED);
            return res;
        };
        res.send = () => res;

        await controller.addGame(new GameDto(), res);
    });

    it('addGame() should return BAD_REQUEST when service add the game', async () => {
        gameService.putGame.rejects();

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.BAD_REQUEST);
            return res;
        };
        res.send = () => res;

        await controller.addGame(new GameDto(), res);
    });

    it('patchGame() should succeed if service able to modify the game', async () => {
        gameService.patchGame.resolves();

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.send = () => res;

        await controller.patchGame('id', new UpdateGameDto(), res);
    });

    it('patchGame() should return NOT_FOUND when service cannot modify the game', async () => {
        gameService.patchGame.rejects();

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;

        await controller.patchGame('id', new UpdateGameDto(), res);
    });

    it('deleteGame() should succeed if service able to delete the game', async () => {
        gameService.deleteGame.resolves();

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.send = () => res;

        await controller.deleteGame('', res);
    });

    it('deleteGame() should return NOT_FOUND when service cannot delete the game', async () => {
        gameService.deleteGame.rejects();

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;

        await controller.deleteGame('', res);
    });

    it('exportGame() should export the game', async () => {
        const mockMap: Map = {
            _tiles: [],
            _size: 10,
            _items: [],
            mode: ModeEnum.BR,
        };

        const mockGame1 = {
            title: 'Game 1',
            map: mockMap,
            size: 10,
            description: 'desc1',
            isVisible: false,
            _id: 'id1',
            lastMod: '2024-11-28',
        } as unknown as Game;

        gameService.getGame.resolves(mockGame1);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.json = (exportedGame) => {
            expect(exportedGame).toEqual({
                title: 'Game 1',
                map: mockMap,
                size: 10,
                description: 'desc1',
                _id: 'id1',
                lastMod: '2024-11-28',
            });
            return res;
        };

        await controller.exportGame('123', res);
    });

    it('exportGame() should return NOT_FOUND if game does not exist', async () => {
        gameService.getGame.resolves(undefined);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = (message) => {
            expect(message).toEqual('Game not found');
            return res;
        };

        await controller.exportGame('123', res);
    });

    it('exportGame() should return INTERNAL_SERVER_ERROR on exception', async () => {
        gameService.getGame.rejects(new Error('Unexpected error'));

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
            return res;
        };
        res.send = (message) => {
            expect(message).toEqual('Unexpected error');
            return res;
        };

        await controller.exportGame('123', res);
    });

    it('importGame() should import the game', async () => {
        const fakeGameDto = { title: 'New Game' } as GameDto;
        const fakeGame = { _id: '123' } as GameDocument;

        gameService.findGameByTitle.resolves(undefined);
        gameService.putGame.resolves(fakeGame);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.CREATED);
            return res;
        };
        res.json = (data) => {
            expect(data).toEqual({ id: '123' });
            return res;
        };

        await controller.importGame(fakeGameDto, res);
    });

    it('importGame() should return BAD_REQUEST if validation fails', async () => {
        const fakeGameDto = { title: 'Invalid Game' } as GameDto;

        gameService.findGameByTitle.resolves(undefined);
        gameService.putGame.rejects({ details: ['Validation error'] });

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.BAD_REQUEST);
            return res;
        };
        res.json = (data) => {
            expect(data).toEqual({
                message: "Échec de l'importation : validation invalide.",
                errors: ['Validation error'],
            });
            return res;
        };

        await controller.importGame(fakeGameDto, res);
    });

    it('importGame() should return INTERNAL_SERVER_ERROR', async () => {
        const fakeGameDto = { title: 'Test Game' } as GameDto;

        gameService.findGameByTitle.rejects(new Error('Unexpected error'));

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
            return res;
        };
        res.send = (message) => {
            expect(message).toEqual("Échec de l'importation : Unexpected error");
            return res;
        };

        await controller.importGame(fakeGameDto, res);
    });
});
