import { Game, GameDocument } from '@app/model/database/game';
import { GameDto } from '@app/model/dto/game/game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
import { DateService } from '@app/services/date/date.service';
import { ValidateGameService } from '@app/services/validate-game/validate-game.service';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class GameService {
    constructor(
        @InjectModel(Game.name) public gameModel: Model<GameDocument>,
        private readonly logger: Logger,
        private readonly dateService: DateService,
        private readonly validateGameService: ValidateGameService,
    ) {}

    async getGames(): Promise<Game[]> {
        try {
            return await this.gameModel.find({});
        } catch (error) {
            return Promise.reject(`Failed to get games: ${error}`);
        }
    }

    async getGame(id: string): Promise<Game> {
        try {
            return await this.gameModel.findOne({ _id: id });
        } catch (error) {
            return Promise.reject(`Failed to get game of id ${id} : ${error}`);
        }
    }

    async putGame(game: GameDto): Promise<GameDocument> {
        // Throws an error if invalid
        await this.validateGameService.verify(game);
        if (game._id) {
            const replacingGame = { ...game, lastMod: this.dateService.currentTime() };
            await this.gameModel.replaceOne({ _id: game._id }, replacingGame);
            return await this.gameModel.findById({ _id: game._id });
        } else {
            const createdGame = { ...game, lastMod: this.dateService.currentTime() };
            return await this.gameModel.create(createdGame);
        }
    }

    async deleteGame(id: string): Promise<void> {
        try {
            const res = await this.gameModel.deleteOne({ _id: id });
            if (res.deletedCount === 0) {
                throw new Error('Could not find game');
            }
        } catch (error) {
            return Promise.reject(`Failed to delete game: ${error}`);
        }
    }

    async patchGame(id: string, gameUpdateInfo: UpdateGameDto) {
        try {
            const res = await this.gameModel.updateOne({ _id: id }, { ...gameUpdateInfo, lastMod: this.dateService.currentTime() });
            if (res.modifiedCount < 1) throw new Error('Could not find game');
            return await this.gameModel.findById({ _id: id });
        } catch (error) {
            return Promise.reject(`Failed to patch game: ${error}`);
        }
    }

    async findGameByTitle(title: string): Promise<Game | null> {
        try {
            return await this.gameModel.findOne({ title });
        } catch (error) {
            throw new Error(`Failed to find the game : ${error.message}`);
        }
    }
}
