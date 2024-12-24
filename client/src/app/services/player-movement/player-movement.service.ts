import { Injectable } from '@angular/core';
import { GameService } from '@app/services/game/game.service';
import { SocketService } from '@app/services/socket/socket.service';
import { directions } from '@common/directions';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { Position } from '@common/interfaces/position';
import { Tile, tileProperties } from '@common/interfaces/tile';

@Injectable({
    providedIn: 'root',
})
export class PlayerMovementService {
    constructor(
        private socketService: SocketService,
        private gameService: GameService,
    ) {}

    movePlayer(path: [number, number][]): void {
        this.socketService.send<[number, number][]>(GameLogicEvents.MovePlayer, path);
    }

    findPath(end: Position): Position[] | null {
        if (!this.gameService.gameState.map || !this.gameService.gameState || !this.gameService.gameState.activePlayer) return null;

        const grid = this.gameService.gameState.map._tiles;
        const start = this.gameService.gameState.activePlayer.position;

        if (!grid || !start) {
            return null;
        }

        const openList: Node[] = [];
        const closedList: Set<string> = new Set();

        const startNode = this.createNode(start, 0, null);
        openList.push(startNode);

        const nodeMap: Record<string, Node> = {};
        nodeMap[this.getNodeKey(start)] = startNode;

        while (openList.length > 0) {
            this.sortNodesByTotalCost(openList);
            const currentNode = openList.shift() as Node;

            if (this.isEndNode(currentNode, end)) {
                return this.reconstructPath(currentNode);
            }

            this.processNeighbors(currentNode, openList, closedList, nodeMap, grid);
        }

        return null;
    }

    toggleDoor(pos: Position): void {
        this.socketService.send<Position>('toggleDoor', pos);
    }

    isValidTile(x: number, y: number): boolean {
        const gameState = this.gameService.gameState;

        if (!gameState || !gameState.map) return false;

        const { map, availableTiles } = gameState;
        if (x < 0 || y < 0 || x >= map._tiles[0].length || y >= map._tiles.length) return false;
        if (map._tiles[y][x].player) return false;

        return availableTiles ? availableTiles.some(([tileX, tileY]) => tileX === x && tileY === y) : false;
    }

    teleportPlayer(position: Position) {
        this.socketService.send<Position>(GameLogicEvents.TeleportPlayer, position);
    }

    private createNode(position: Position, cost: number, previous: Node | null): Node {
        return {
            position,
            cost,
            heuristic: 0,
            totalCost: cost,
            previous: previous || undefined,
        };
    }

    private getNodeKey(position: Position): string {
        return `${position.x},${position.y}`;
    }

    private sortNodesByTotalCost(nodes: Node[]): void {
        nodes.sort((a, b) => a.totalCost - b.totalCost);
    }

    private isEndNode(node: Node, end: Position): boolean {
        return node.position.x === end.x && node.position.y === end.y;
    }

    private processNeighbors(currentNode: Node, openList: Node[], closedList: Set<string>, nodeMap: Record<string, Node>, grid: Tile[][]): void {
        const currentKey = this.getNodeKey(currentNode.position);
        closedList.add(currentKey);

        for (const [dx, dy] of directions) {
            const newX = currentNode.position.x + dx;
            const newY = currentNode.position.y + dy;
            const neighborKey = this.getNodeKey({ x: newX, y: newY });

            if (closedList.has(neighborKey) || !this.isValidTile(newX, newY)) {
                continue;
            }

            const moveCost = this.getTileCost(grid, newX, newY);
            const newCost = currentNode.cost + moveCost;

            const existingNode = nodeMap[neighborKey];
            if (!existingNode || newCost < existingNode.cost) {
                const neighborNode = this.createNode({ x: newX, y: newY }, newCost, currentNode);
                openList.push(neighborNode);
                nodeMap[neighborKey] = neighborNode;
            }
        }
    }

    private getTileCost(grid: Tile[][], x: number, y: number): number {
        const tileType = grid[y][x]._tileType;
        return tileProperties[tileType]?.weight ?? Infinity;
    }

    private reconstructPath(node: Node): Position[] {
        const path: Position[] = [];
        let current: Node | undefined = node;
        while (current) {
            path.push(current.position);
            current = current.previous;
        }
        return path.reverse();
    }
}

interface Node {
    position: Position;
    cost: number;
    heuristic: number;
    totalCost: number;
    previous?: Node;
}
