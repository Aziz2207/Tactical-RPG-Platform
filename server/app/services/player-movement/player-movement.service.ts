import { ActiveSession } from '@app/interfaces/active-session';
import { ActionsService } from '@app/services/actions/actions.service';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { TileValidityService } from '@app/services/tile-validity/tile-validity.service';
import { TurnService } from '@app/services/turn/turn.service';
import { CONSTANTS } from '@common/constants';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { Item } from '@common/interfaces/item';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { Room } from '@common/interfaces/room';
import { Tile, tileProperties } from '@common/interfaces/tile';
import { ItemEnum } from '@common/item-enum';
import { TileEnum } from '@common/tile-enum';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class PlayerMovementService {
    private movementCosts = {
        grass: 1,
        openDoor: 1,
        water: 2,
        ice: 0,
    };

    constructor(
        private tileValidityService: TileValidityService,
        private turnService: TurnService,
        private actionsService: ActionsService,
        private infoService: GameInfoService,
    ) {}

    async movePlayer(socketId: string, session: ActiveSession, path: [number, number][], server: Server): Promise<void> {
        if (!session.movementUnlocked || path.length === 0) return;
        const room = session.room;
        const currentPlayer = room.players.find((player: Player) => player.socketId === socketId);
        if (!currentPlayer) return;
        const tiles = session.room.map._tiles;
        let movementEnded = false;

        for (const step of path) {
            session.movementUnlocked = false;
            const position = { x: step[0], y: step[1] };
            this.infoService.addVisitedTile(room.code, currentPlayer.socketId, `${position.x},${position.y}`);
            this.infoService.calculatePlayerTiles(room.code, this.tileValidityService.countValidTiles(room.map));
            this.infoService.calculateGlobalTiles(room.code, this.tileValidityService.countValidTiles(room.map));

            movementEnded = this.normalModeMovement(currentPlayer, position, session);

            if (this.isFlagOnStartPoint(position, currentPlayer)) {
                this.turnService.stopGame(session, server, currentPlayer);
            }
            this.serverEmissions(server, session, currentPlayer);
            if (this.isValidItem(session.room, position)) {
                session.movementUnlocked = true;
                this.handleInventory(tiles[position.y][position.x].item, server, position, session, currentPlayer);
                return;
            }
            if (movementEnded) return;
            await this.wait150Ms();
        }

        session.movementUnlocked = true;
        if (!currentPlayer.isVirtual) {
            this.actionsService.canStillActCheck(currentPlayer, room.map, session, server);
        }
    }

    async wait150Ms(): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, CONSTANTS.MOVEMENT_DURATION));
    }

    isFlagOnStartPoint(position: Position, currentPlayer: Player): boolean {
        return (
            position.x === currentPlayer.startPosition.x &&
            position.y === currentPlayer.startPosition.y &&
            currentPlayer.inventory.some((item) => item.itemType === ItemEnum.Flag)
        );
    }

    handleInventory(newItem: Item, server: Server, { x, y }: Position, session: ActiveSession, currentPlayer: Player): void {
        let discardedItem: Item | undefined;
        if (currentPlayer.isVirtual) {
            discardedItem = this.actionsService.handleVirtualPlayerInventory(currentPlayer, newItem, session, server);
        } else {
            server.to(session.room.code).emit(GameLogicEvents.UpdatePlayerInventory, newItem);
        }
        this.updateMapWithItem(session.room, server, x, y, discardedItem);
    }

    teleportPlayer(player: Player, map: Map, position: Position) {
        if (player.position.x >= 0 && player.position.y >= 0) {
            map._tiles[player.position.y][player.position.x].player = undefined;
        }
        player.position = position;
        map._tiles[position.y][position.x].player = player;
    }

    loadCharacters(server: Server, session: ActiveSession): void {
        const map = session.room.map;
        const roomCode = session.room.code;
        const startingPoints: { x: number; y: number }[] = [];

        map._tiles.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (tile.item?.itemType === 'start') {
                    startingPoints.push({ x, y });
                }
            });
        });

        const shuffledStartingPoints = this.shuffleArray(startingPoints);

        session.room.players.forEach((player: Player, i) => {
            const pos = shuffledStartingPoints[i];
            player.startPosition = pos;
            player.position = pos;
            map._tiles[pos.y][pos.x].player = player;
        });

        shuffledStartingPoints.slice(session.room.players.length).forEach((pos) => {
            map._tiles[pos.y][pos.x].item = undefined;
        });

        server.to(roomCode).emit(GameLogicEvents.UpdateMap, map);
    }

    shuffleArray(array: Position[]): Position[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    teleportPlayerDebug(socketId: string, session: ActiveSession, position: Position, server: Server) {
        const room = session.room;
        const map = session.room.map;
        const tiles = session.room.map._tiles;

        const currentPlayer = room.players.find((player: Player) => player.socketId === socketId);
        if (!currentPlayer || !this.tileValidityService.isValidTile(map._tiles, position.x, position.y)) return;
        this.teleportPlayer(currentPlayer, map, position);
        if (this.isFlagOnStartPoint(position, currentPlayer)) {
            this.turnService.stopGame(session, server, currentPlayer);
        }
        this.serverEmissions(server, session, currentPlayer);
        if (this.isValidItem(session.room, position)) {
            session.movementUnlocked = true;
            this.handleInventory(tiles[position.y][position.x].item, server, position, session, currentPlayer);
            return;
        }
    }

    private updateMapWithItem(room: Room, server: Server, x: number, y: number, discardedItem?: Item): void {
        room.map._tiles[y][x].item = discardedItem || undefined;
        server.to(room.code).emit(GameLogicEvents.UpdateMap, room.map);
    }

    private checkIfSlippedIce(currentPlayer: Player, tile: Tile, session: ActiveSession) {
        const slipChance = Math.random() <= CONSTANTS.SLIP_CHANCE;
        const itemCheck = !this.actionsService.hasPicItem(currentPlayer);
        const isIce = tile._tileType === TileEnum.Ice;
        return slipChance && itemCheck && isIce && !session.debugMode;
    }

    private serverEmissions(server: Server, session: ActiveSession, currentPlayer: Player) {
        const code = session.room.code;
        server.to(currentPlayer.socketId).emit(GameLogicEvents.UpdatePlayerSpeed, currentPlayer.attributes.currentSpeed);
        server.to(currentPlayer.socketId).emit(GameLogicEvents.UpdatePlayerPos, currentPlayer.position);
        server.to(code).emit(GameLogicEvents.UpdateMap, session.room.map);
        const reachableTiles = this.tileValidityService.getReachableTiles(session.room.map, currentPlayer);
        server.to(currentPlayer.socketId).emit('availableTiles', reachableTiles);
    }

    private isValidItem(room: Room, { x, y }: Position): boolean {
        return room.map._tiles[y][x].item && room.map._tiles[y][x].item.itemType !== 'start';
    }

    private normalModeMovement(currentPlayer: Player, nextPosition: Position, session: ActiveSession): boolean {
        const tiles = session.room.map._tiles;
        this.teleportPlayer(currentPlayer, session.room.map, nextPosition);

        if (this.checkIfSlippedIce(currentPlayer, tiles[nextPosition.y][nextPosition.x], session)) {
            session.movementUnlocked = true;
            this.turnService.endTurn(session, session.server);
            return true;
        }
        const tileType = tiles[nextPosition.y][nextPosition.x]._tileType;
        currentPlayer.attributes.currentSpeed -= tileProperties[tileType].weight;
        if (currentPlayer.attributes.currentSpeed <= 0) {
            session.movementUnlocked = true;
            if (!this.actionsService.playerCanDoAction(currentPlayer, session) && !currentPlayer.isVirtual)
                this.turnService.endTurn(session, session.server);
            return true;
        }
        return false;
    }
}
