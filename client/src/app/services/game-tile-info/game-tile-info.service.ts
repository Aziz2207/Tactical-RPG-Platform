import { Injectable } from '@angular/core';
import { TileService } from '@app/services/tile/tile.service';
import { GameTile } from '@common/interfaces/game-tile';
import { Player } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { gameObjects } from '@common/objects-info';
import { gameTiles } from '@common/tile-info';

@Injectable({
    providedIn: 'root',
})
export class GameTileInfoService {
    tileId: number = 0;
    itemId: number = 0;
    selectedPlayer?: Player;
    selectedRow: number = -1;
    selectedCol: number = -1;
    gameTile: GameTile = {
        id: 1,
        name: '',
        descriptions: [],
        image: '',
    };

    constructor(public tileService: TileService) {}

    getItem() {
        const foundItem = gameObjects.find((item) => item.id === this.itemId);
        if (foundItem) {
            return foundItem;
        }
        return null;
    }

    getTile() {
        const foundTile = gameTiles.find((tile) => tile.id === this.tileId);
        if (foundTile) {
            return foundTile;
        }
        return null;
    }

    transferRoomData(room: Room) {
        this.tileId = room.gameMap.tiles[this.selectedRow][this.selectedCol];
        this.itemId = room.gameMap.itemPlacement[this.selectedRow][this.selectedCol];
        this.selectedPlayer = this.getPlayer(room);
    }

    getPlayer(room: Room) {
        for (const player of room.listPlayers) {
            if (player.position.x === this.selectedRow && player.position.y === this.selectedCol) {
                return player;
            }
        }
        return undefined;
    }
}
