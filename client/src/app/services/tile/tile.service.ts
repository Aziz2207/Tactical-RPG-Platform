import { Injectable } from '@angular/core';
import { NO_OBJECT, TileId } from '@app/constants';
import { TileType } from '@common/constants';
import { GridOperationsInfo } from '@common/interfaces/grid-operations-info';
import { gameTiles } from '@common/tile-info';
@Injectable({
    providedIn: 'root',
})
export class TileService {
    getTileImage(value: number): string {
        const gameTile = gameTiles.find((tile) => tile.id === value);
        if (gameTile) {
            return gameTile.image;
        }
        return '';
    }

    setTile(selectedTile: string, row: number, col: number, array: number[][]) {
        switch (selectedTile) {
            case TileId.Ice:
                array[row][col] = TileType.Ice;
                break;
            case TileId.Wall:
                array[row][col] = TileType.Wall;
                break;
            case TileId.Water:
                array[row][col] = TileType.Water;
                break;
            case TileId.Door:
                array[row][col] = array[row][col] === TileType.ClosedDoor ? TileType.OpenDoor : TileType.ClosedDoor;
                break;
            default:
                break;
        }
    }

    removeTile(event: MouseEvent, { position, tiles, objects }: GridOperationsInfo) {
        event.preventDefault();
        if (tiles[position.x][position.y] !== TileType.Ground && objects[position.x][position.y] === NO_OBJECT) {
            tiles[position.x][position.y] = TileType.Ground;
        }
        return tiles;
    }

    countTiles(condition: (tile: number) => boolean, grid: number[][]): number {
        let count = 0;
        for (const row of grid) {
            for (const tile of row) {
                if (condition(tile)) {
                    count++;
                }
            }
        }
        return count;
    }

    findTotalTerrainTiles(grid: number[][]): number {
        return this.countTiles((tile) => tile < TileType.Wall, grid);
    }

    findTotalDoors(grid: number[][]): number {
        return this.countTiles((tile) => tile > TileType.Wall, grid);
    }
}
