import { Game, GameDocument } from '@app/model/database/game';
import { GameDto } from '@app/model/dto/game/game.dto';
import { ItemDto } from '@app/model/dto/game/item.dto';
import { MapDto } from '@app/model/dto/game/map.dto';
import { TileDto } from '@app/model/dto/game/tile.dto';
import { CONSTANTS } from '@common/constants';
import { tileProperties } from '@common/interfaces/tile';
import { ItemEnum } from '@common/item-enum';
import { ModeEnum } from '@common/mode-enum';
import { TileEnum } from '@common/tile-enum';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ValidateGameService {
    maxItemCount: number = 0;
    constructor(@InjectModel(Game.name) public gameModel: Model<GameDocument>) {}

    async verify(game: GameDto): Promise<boolean> {
        const errorMessages: string[] = [];

        const uniqueTitle = await this.verifyUniqueTitle(game.title);
        if (!uniqueTitle) errorMessages.push('Le titre existe déjà.');

        const isMapValid = this.verifyMap(game.map, errorMessages);

        if (!uniqueTitle || !isMapValid) {
            throw new Error(errorMessages.join('\n'));
        }

        return true;
    }

    async verifyWithoutTitle(game: GameDto): Promise<boolean> {
        const errorMessages: string[] = [];

        const isTitleValid = this.verifyTitleAndDescription(game, errorMessages);
        const isMapValid = this.verifyMap(game.map, errorMessages);

        if (!isTitleValid || !isMapValid) {
            throw new Error(errorMessages.join('\n'));
        }

        return true;
    }

    verifyMap(map: MapDto, errorMessages: string[]): boolean {
        let validate = true;
        const invalidSP: ItemDto | undefined = map._items.find((item) => item.itemType === ItemEnum.StartPoint && item.isOnGrid === false);
        if (invalidSP) {
            errorMessages.push('Il faut placer les points de départs.');
            validate = false;
        }

        if (map.mode === ModeEnum.CTF) {
            const flagItem: ItemDto = map._items.find((item: ItemDto) => item.itemType === ItemEnum.Flag);
            if (flagItem && !flagItem.isOnGrid) {
                validate = false;
                errorMessages.push('Le drapeau doit etre sur la carte.');
            }
        }

        let doorsValid = true;
        let itemCount = 0;
        let terrainCount = 0;
        let traversableCount = 0;

        map._tiles.forEach((row: TileDto[], y: number) => {
            row.forEach((tile: TileDto, x: number) => {
                if (!this.verifyTileProperties(tile, x, y, errorMessages)) {
                    validate = false;
                }
                if (tileProperties[tile._tileType].terrain) {
                    terrainCount = terrainCount + 1;
                }
                if (tileProperties[tile._tileType].traversable) {
                    if (!this.verifyDoor(x, y, map._tiles, errorMessages)) doorsValid = false;
                    traversableCount++;
                }
                if (tile.item && tile.item.isRandom) {
                    itemCount++;
                }
            });
        });
        if (!this.verifyItemCount(itemCount, map, errorMessages)) {
            validate = false;
        }
        if (!doorsValid) validate = false;

        if (!this.verifyConnectivity(map._tiles, traversableCount)) {
            errorMessages.push('Les tuiles de terrain ne sont pas toutes connectés.');
            validate = false;
        }

        return validate;
    }

    verifyItemCount(itemCount: number, map: MapDto, errorMessages: string[]): boolean {
        if (Number(map._size) === CONSTANTS.SMALL_MAP_SIZE) {
            this.maxItemCount = 2;
        } else if (Number(map._size) === CONSTANTS.MEDIUM_MAP_SIZE) {
            this.maxItemCount = 4;
        } else if (Number(map._size) === CONSTANTS.LARGE_MAP_SIZE) {
            this.maxItemCount = 6;
        }

        if (itemCount < 2) {
            errorMessages.push('Il faut au moins 2 items dans le jeu');
            return false;
        } else if (itemCount > this.maxItemCount) {
            errorMessages.push("Il y a trop d'items. Votre maximum est " + this.maxItemCount + '.');
            return false;
        }
        return true;
    }

    verifyDoor(x: number, y: number, tiles: TileDto[][], errorMessages: string[]): boolean {
        if (tiles[y][x]._tileType !== TileEnum.ClosedDoor && tiles[y][x]._tileType !== TileEnum.OpenDoor) return true;

        if (y === 0 || y === tiles.length - 1 || x === 0 || x === tiles.length - 1) {
            errorMessages.push('Une porte ne doit pas etre en extremité.');
            return false;
        }

        const validNeighbours: TileEnum[] = [TileEnum.Grass, TileEnum.Ice];

        if (tiles[y][x + 1]._tileType === TileEnum.Rock && tiles[y][x - 1]._tileType === TileEnum.Rock) {
            if (validNeighbours.includes(tiles[y + 1][x]._tileType) && validNeighbours.includes(tiles[y - 1][x]._tileType)) {
                return true;
            }
        }

        if (tiles[y + 1][x]._tileType === TileEnum.Rock && tiles[y - 1][x]._tileType === TileEnum.Rock) {
            if (validNeighbours.includes(tiles[y][x + 1]._tileType) && validNeighbours.includes(tiles[y][x - 1]._tileType)) {
                return true;
            }
        }

        errorMessages.push('La porte doit etre connéctee aux murs et etre traversable.');
        return false;
    }

    verifyConnectivity(tiles: TileDto[][], traversableCount: number): boolean {
        const visited: boolean[][] = Array.from(tiles, (row) => {
            return Array.from(row, () => false);
        });

        let curX: number;
        let curY: number;
        tiles.find((row, y: number) => {
            curY = y;
            return row.find((tile, x: number) => {
                curX = x;
                return tile.traversable || tile._tileType === TileEnum.ClosedDoor;
            });
        });

        const queue: { x: number; y: number; tile: TileDto }[] = [];
        queue.push({ x: curX, y: curY, tile: tiles[curY][curX] });

        let reachableTilesCount = 0;
        while (queue.length !== 0) {
            const position: { x: number; y: number; tile: TileDto } = queue.shift();

            if (visited[position.y][position.x] === true) continue;

            visited[position.y][position.x] = true;
            reachableTilesCount++;

            if (position.x > 0 && tileProperties[tiles[position.y][position.x - 1]._tileType].traversable && !visited[position.y][position.x - 1]) {
                queue.push({ x: position.x - 1, y: position.y, tile: tiles[position.y][position.x - 1] });
            }

            if (
                position.y < tiles.length - 1 &&
                tileProperties[tiles[position.y + 1][position.x]._tileType].traversable &&
                !visited[position.y + 1][position.x]
            ) {
                queue.push({ x: position.x, y: position.y + 1, tile: tiles[position.y + 1][position.x] });
            }

            if (position.y > 0 && tileProperties[tiles[position.y - 1][position.x]._tileType].traversable && !visited[position.y - 1][position.x]) {
                queue.push({ x: position.x, y: position.y - 1, tile: tiles[position.y - 1][position.x] });
            }

            if (
                position.x < tiles.length - 1 &&
                tileProperties[tiles[position.y][position.x + 1]._tileType].traversable &&
                !visited[position.y][position.x + 1]
            ) {
                queue.push({ x: position.x + 1, y: position.y, tile: tiles[position.y][position.x + 1] });
            }
        }

        return reachableTilesCount === traversableCount;
    }

    verifyTileProperties(tile: TileDto, x: number, y: number, errorMessages: string[]): boolean {
        const expectedProperties = tileProperties[tile._tileType];

        if (!expectedProperties) {
            errorMessages.push(`Tuile invalide à la position (${x}, ${y}): type de tuile inconnu.`);
            return false;
        }

        if (tile.traversable !== expectedProperties.traversable) {
            errorMessages.push(`La tuile à la position (${x}, ${y}) de type ${tile._tileType} a une propriété 'traversable' incorrecte.`);
            return false;
        }

        if (tile.imageSrc !== expectedProperties.imageSrc) {
            errorMessages.push(`La tuile à la position (${x}, ${y}) de type ${tile._tileType} a une propriété 'imageSrc' incorrecte.`);
            return false;
        }

        return true;
    }

    async verifyUniqueTitle(title: string) {
        const games: Game[] = await this.gameModel.find({});
        return !games.some((game: Game) => game.title === title);
    }

    private verifyTitleAndDescription(game: GameDto, errorMessages: string[]): boolean {
        let valid = true;
        if (game.title.length > CONSTANTS.MAX_NAME_LENGTH) {
            errorMessages.push('Le titre du jeu ne doit pas dépasser 10 caractères.');
            valid = false;
        }

        if (game.description?.length > CONSTANTS.MAX_DESCRIPTION_LENGTH) {
            errorMessages.push('La description du jeu ne doit pas dépasser 150 caractères.');
            valid = false;
        }

        return valid;
    }
}
