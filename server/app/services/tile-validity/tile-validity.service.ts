import { PriorityQueueItem } from '@app/interfaces/priority-queue-item';
import { ReachableTiles } from '@app/interfaces/reachable-tiles';
import { directions } from '@common/directions';
import { Map as gameMap } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { Tile, tileProperties } from '@common/interfaces/tile';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TileValidityService {
    getReachableTiles(map: gameMap, player: Player): [number, number][] {
        const speed = player?.attributes.currentSpeed;
        const grid = map._tiles;
        const startX = player?.position.x;
        const startY = player?.position.y;

        const state: ReachableTiles = this.initializeReachableTiles(startX, startY);
        const priorityQueue: PriorityQueueItem[] = this.initializePriorityQueue(startX, startY);

        return this.processReachableTiles(priorityQueue, state, speed, grid);
    }

    getAdjacentTiles(position: Position, map: Tile[][]): [number, number][] {
        const adjacentTiles: [number, number][] = [];
        const { x, y } = position;

        const potentialPositions: [number, number][] = [
            [x, y - 1],
            [x, y + 1],
            [x - 1, y],
            [x + 1, y],
        ];

        for (const [nextX, nextY] of potentialPositions) {
            if (this.boundsCheck({ x: nextX, y: nextY }, map)) {
                adjacentTiles.push([nextX, nextY]);
            }
        }

        return adjacentTiles;
    }

    isAdjascent(player: Player, position: Position): boolean {
        const playerPos = player.position;
        if (!playerPos) return false;

        if (
            (playerPos.x === position.x && playerPos.y === position.y + 1) ||
            (playerPos.x === position.x && playerPos.y === position.y - 1) ||
            (playerPos.x === position.x - 1 && playerPos.y === position.y) ||
            (playerPos.x === position.x + 1 && playerPos.y === position.y)
        )
            return true;
        else return false;
    }

    isValidTile(grid: Tile[][], x: number, y: number): boolean {
        if (!this.boundsCheck({ x, y }, grid)) return false;

        const tile = grid[y][x];
        return tile._tileType !== 'rock' && tile._tileType !== 'closedDoor' && !tile.player;
    }

    boundsCheck(pos: Position, grid: Tile[][]) {
        return pos.x >= 0 && pos.y >= 0 && pos.x < grid[0].length && pos.y < grid.length;
    }

    findPath(player: Player, targetTile: [number, number], grid: Tile[][]): [number, number][] {
        const visited = new Set<string>();
        const queue: {
            pos: [number, number];
            path: [number, number][];
        }[] = [{ pos: [player.position.x, player.position.y], path: [] }];

        while (queue.length > 0) {
            const { pos, path } = queue.shift();
            const key = `${pos[0]},${pos[1]}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (pos[0] === targetTile[0] && pos[1] === targetTile[1]) {
                path.shift(); // get rid of starting tile cause its the tile hes already on
                return [...path, pos];
            }

            const neighbors = this.getValidNeighbors(pos, grid);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor[0]},${neighbor[1]}`;
                if (!visited.has(neighborKey) && this.isValidTile(grid, neighbor[0], neighbor[1])) {
                    queue.push({ pos: neighbor, path: [...path, pos] });
                }
            }
        }
        return [];
    }

    getValidNeighbors(pos: [number, number], grid: Tile[][]): [number, number][] {
        const neighbors: [number, number][] = [
            [pos[0] - 1, pos[1]],
            [pos[0] + 1, pos[1]],
            [pos[0], pos[1] - 1],
            [pos[0], pos[1] + 1],
        ];
        return neighbors.filter(([x, y]) => this.boundsCheck({ x, y }, grid) && this.isValidTile(grid, x, y));
    }

    calculateNearestPosition(player: Player, map: gameMap): Position[] {
        const availablePositions: Position[] = [];
        const playerPosition = player.position;

        for (let row = 0; row < map._size; row++) {
            for (let col = 0; col < map._size; col++) {
                const tilePos = { x: row, y: col };

                if (this.isValidTile(map._tiles, row, col)) {
                    availablePositions.push(tilePos);
                }
            }
        }
        availablePositions.sort((a, b) => {
            const distA = this.calculateDistance(playerPosition, a);
            const distB = this.calculateDistance(playerPosition, b);
            return distA - distB;
        });

        return availablePositions.slice(0, player.inventory.length);
    }

    calculateDistance(playerPos: Position, pFinal: Position): number {
        return Math.max(Math.abs(pFinal.x - playerPos.x), Math.abs(pFinal.y - playerPos.y));
    }

    countValidTiles(map: gameMap): number {
        let validTilesCount = 0;
        for (let y = 0; y < map._tiles.length; y++) {
            for (let x = 0; x < map._tiles[y].length; x++) {
                if (this.isValidTile(map._tiles, x, y)) {
                    validTilesCount++;
                }
            }
        }
        return validTilesCount;
    }

    countDoors(map: gameMap): number {
        let doorsCount = 0;
        for (const row of map._tiles) {
            for (const tile of row) {
                if (tile._tileType === 'closedDoor' || tile._tileType === 'openDoor') {
                    doorsCount++;
                }
            }
        }
        return doorsCount;
    }

    private initializeReachableTiles(startX: number, startY: number): ReachableTiles {
        const visited = new Set<string>();
        const costs = new Map<string, number>();
        costs.set(`${startX},${startY}`, 0);

        return { visited, costs, reachable: [] };
    }

    private initializePriorityQueue(startX: number, startY: number): PriorityQueueItem[] {
        return [{ cumulativeCost: 0, x: startX, y: startY }];
    }

    private processReachableTiles(priorityQueue: PriorityQueueItem[], state: ReachableTiles, speed: number, grid: Tile[][]): [number, number][] {
        while (priorityQueue.length > 0) {
            priorityQueue.sort((a, b) => a.cumulativeCost - b.cumulativeCost);
            const { cumulativeCost, x, y } = priorityQueue.shift();
            const tileKey = `${x},${y}`;

            if (state.visited.has(tileKey)) continue;
            state.visited.add(tileKey);

            if (cumulativeCost <= speed) {
                state.reachable.push([x, y]);
            } else {
                continue;
            }

            this.addNeighborsToQueue(priorityQueue, state, cumulativeCost, { x, y }, grid);
        }

        return state.reachable;
    }

    private addNeighborsToQueue(
        priorityQueue: PriorityQueueItem[],
        state: ReachableTiles,
        cumulativeCost: number,
        { x, y }: Position,
        grid: Tile[][],
    ): void {
        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            if (this.isValidTile(grid, newX, newY)) {
                const neighborKey = `${newX},${newY}`;
                const neighborTileType = grid[newY][newX]._tileType;
                const neighborMoveCost = tileProperties[neighborTileType].weight;
                const newCumulativeCost = cumulativeCost + neighborMoveCost;

                if (!state.costs.has(neighborKey) || newCumulativeCost < state.costs.get(neighborKey)) {
                    state.costs.set(neighborKey, newCumulativeCost);
                    priorityQueue.push({ cumulativeCost: newCumulativeCost, x: newX, y: newY });
                }
            }
        }
    }
}
