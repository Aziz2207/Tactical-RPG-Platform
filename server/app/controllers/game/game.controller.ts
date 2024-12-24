import { Game } from '@app/model/database/game';
import { GameDto } from '@app/model/dto/game/game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { GameService } from '@app/services/game/game.service';
import { ValidateGameService } from '@app/services/validate-game/validate-game.service';
import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Put, Res } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Games')
@Controller('game')
export class GameController {
    constructor(
        private readonly gamesService: GameService,
        private readonly validateGameService: ValidateGameService,
    ) {}

    @ApiOkResponse({
        description: 'Returns all games',
        type: Game,
        isArray: true,
    })
    @ApiNotFoundResponse({
        description: 'Return NOT_FOUND http status when request fails',
    })
    @Get('/all')
    async getGames(@Res() response: Response) {
        try {
            const gameList = await this.gamesService.getGames();
            response.status(HttpStatus.OK).json(
                gameList.map((game) => {
                    return { title: game.title, _id: game._id, isVisible: game.isVisible };
                }),
            );
        } catch (error) {
            response.status(HttpStatus.NOT_FOUND).send(error.message);
        }
    }

    @ApiOkResponse({
        description: 'Get game by id',
        type: Game,
    })
    @ApiNotFoundResponse({
        description: 'Return NOT_FOUND http status when request fails',
    })
    @Get(':id')
    async getGameById(@Param('id') id: string, @Res() response: Response) {
        try {
            const game = await this.gamesService.getGame(id);
            response.status(HttpStatus.OK).json(game);
        } catch (error) {
            response.status(HttpStatus.NOT_FOUND).send(error.message);
        }
    }

    @Get(':id/export')
    async exportGame(@Param('id') id: string, @Res() response: Response) {
        try {
            const game = await this.gamesService.getGame(id);
            if (!game) {
                response.status(HttpStatus.NOT_FOUND).send('Game not found');
                return;
            }

            const gameJson = JSON.parse(JSON.stringify(game));
            delete gameJson.isVisible;

            response.status(HttpStatus.OK).json(gameJson);
        } catch (error) {
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error.message);
        }
    }

    @ApiCreatedResponse({
        description: 'Add new game',
    })
    @ApiNotFoundResponse({
        description: 'Return NOT_FOUND http status when request fails',
    })
    @Put('')
    async addGame(@Body() gameDto: GameDto, @Res() response: Response) {
        try {
            const game = await this.gamesService.putGame(gameDto);
            response.status(HttpStatus.CREATED).send({ id: game._id });
        } catch (error) {
            response.status(HttpStatus.BAD_REQUEST).send({ message: error.message });
        }
    }

    @ApiOkResponse({
        description: 'Delete a course',
    })
    @ApiNotFoundResponse({
        description: 'Return NOT_FOUND http status when request fails',
    })
    @Delete(':id')
    async deleteGame(@Param('id') id: string, @Res() response: Response) {
        try {
            await this.gamesService.deleteGame(id);
            response.status(HttpStatus.OK).send();
        } catch (error) {
            response.status(HttpStatus.NOT_FOUND).send(error.message);
        }
    }

    @Patch(':id')
    async patchGame(@Param('id') id: string, @Body() updateGameDto: UpdateGameDto, @Res() response: Response) {
        try {
            const resObject = await this.gamesService.patchGame(id, updateGameDto);
            response.status(HttpStatus.OK).send(resObject);
        } catch (error) {
            response.status(HttpStatus.NOT_FOUND).send(error.message);
        }
    }

    @Put('/import')
    async importGame(@Body() gameDto: GameDto, @Res() response: Response) {
        try {
            await this.validateGameService.verifyWithoutTitle(gameDto);
            const existingGame = await this.gamesService.findGameByTitle(gameDto.title);
            if (existingGame) {
                response.status(HttpStatus.CONFLICT).json({
                    message: 'Le titre existe déjà. Veuillez choisir un autre titre.',
                    existingGame: { title: existingGame.title },
                });
                return;
            }
            const newGame = await this.gamesService.putGame(gameDto);
            response.status(HttpStatus.CREATED).json({ id: newGame._id });
        } catch (error) {
            if (error.details) {
                response.status(HttpStatus.BAD_REQUEST).json({
                    message: "Échec de l'importation : validation invalide.",
                    errors: error.details,
                });
            } else {
                response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(`Échec de l'importation : ${error.message}`);
            }
        }
    }
}
