import { MILLISECONDS_IN_SECOND, NO_ATTACK_TIME, STARTING_TIME } from '@app/constants';
import { ObjectType } from '@common/avatars-info';
import { Behavior, Player, Position, Status } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { ServerToClientEvent } from '@common/socket.events';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class BotService {
    async processBotTurn(room: Room, server: Server, activePlayer: Player) {
        const isAggressive = activePlayer.behavior === Behavior.Aggressive;
        await this.delay(this.getRandomInt(STARTING_TIME, NO_ATTACK_TIME));
        if (isAggressive) {
            await this.processAggressiveBehavior(room, server, activePlayer);
        } else {
            await this.processDefensiveBehavior(room, server, activePlayer);
        }
    }

    private async processAggressiveBehavior(room: Room, server: Server, activePlayer: Player) {
        const players = room.listPlayers;
        const reachability = room.navigation.findReachableTiles(activePlayer, room);
        if (this.checkEndGame(activePlayer, reachability)) {
            this.navigateToItem(server, room, activePlayer, this.checkForSpawn(reachability, activePlayer));
            return;
        }
        const flag = this.findFlag(room, reachability);
        if (flag) {
            this.navigateToItem(server, room, activePlayer, flag);
            return;
        }
        const target = room.navigation.findClosestPlayer(activePlayer, players, room);
        if (target) {
            this.attackEnemyIfPossible(room, server, activePlayer, target);
            return;
        }
        const item = this.checkForAttackItems(room, reachability);
        if (item) {
            this.navigateToItem(server, room, activePlayer, item);
            return;
        }
        this.navigateToRandomTile(room, server, activePlayer, reachability);
    }

    private async processDefensiveBehavior(room: Room, server: Server, activePlayer: Player) {
        const reachability = room.navigation.findReachableTiles(activePlayer, room);
        if (this.checkEndGame(activePlayer, reachability)) {
            this.navigateToItem(server, room, activePlayer, this.checkForSpawn(reachability, activePlayer));
            return;
        }
        const flag = this.findFlag(room, reachability);
        if (flag) {
            this.navigateToItem(server, room, activePlayer, flag);
            return;
        }
        const defenseItem = this.checkForDefenseItems(room, reachability);
        if (defenseItem) {
            this.navigateToItem(server, room, activePlayer, defenseItem);
            return;
        }
        const players = room.listPlayers;
        const target = room.navigation.findClosestPlayer(activePlayer, players, room);
        if (target) {
            this.attackEnemyIfPossible(room, server, activePlayer, target);
            return;
        }
        this.navigateToRandomTile(room, server, activePlayer, reachability);
    }

    private attackEnemyIfPossible(room: Room, server: Server, activePlayer: Player, target: Player): boolean {
        const path = this.checkForEnemy(room, activePlayer, target);
        if (path) {
            const combatInfo = { target, activePlayer, path };
            this.attackPlayer(room, server, combatInfo);
            return true;
        }
        return false;
    }

    private navigateToItem(server: Server, room: Room, activePlayer: Player, item: Position): boolean {
        const path = room.navigation.findFastestPath(activePlayer, item, room);
        if (path) {
            server.to(room.roomId).emit(ServerToClientEvent.BotNavigation, path);
            return true;
        }
        return false;
    }

    private checkEndGame(activePlayer: Player, reachability: Position[]): boolean {
        const isHavingFlag = activePlayer.inventory.some((item) => item.id === ObjectType.Flag);
        if (isHavingFlag && this.checkForSpawn(reachability, activePlayer)) {
            return true;
        }
        return false;
    }

    private findFlag(room: Room, reachability: Position[]) {
        const items = room.gameMap.itemPlacement;
        for (const tile of reachability) {
            if (items[tile.x][tile.y] === ObjectType.Flag) {
                return tile;
            }
        }
    }

    private navigateToRandomTile(room: Room, server: Server, activePlayer: Player, reachability: Position[]) {
        if (reachability.length === 0) {
            return;
        }
        const randomIndex = Math.floor(Math.random() * reachability.length);
        const randomTile = reachability[randomIndex];
        if (!this.isValidPosition(randomTile, room)) {
            return;
        }
        const path = room.navigation.findFastestPath(activePlayer, randomTile, room);
        server.to(room.roomId).emit(ServerToClientEvent.BotNavigation, path);
    }

    private isValidPosition(position: Position, room: Room) {
        return position.x >= 0 && position.x < room.gameMap.dimension && position.y >= 0 && position.y < room.gameMap.dimension;
    }

    private async attackPlayer(room: Room, server: Server, { target, activePlayer, path }) {
        path.pop();
        server.to(room.roomId).emit(ServerToClientEvent.BotNavigation, path);
        await this.delay(STARTING_TIME * MILLISECONDS_IN_SECOND);
        if (!this.isNeighbour(activePlayer, target)) return;
        if (target.status !== Status.Bot) {
            server.to(target.id).emit(ServerToClientEvent.BotAttack, { clickedPosition: target.position, player: activePlayer });
        } else {
            const host = this.getEventHost(room);
            if (!host) return;
            server.to(host.id).emit(ServerToClientEvent.BotAttack, { clickedPosition: target.position, player: activePlayer });
        }
    }

    private isNeighbour(player: Player, target: Player) {
        return Math.abs(player.position.x - target.position.x) <= 1 && Math.abs(player.position.y - target.position.y) <= 1;
    }

    private getEventHost(room: Room): Player {
        return room.listPlayers.find((player) => player.status !== Status.Disconnected && player.status !== Status.Bot);
    }

    private checkForEnemy(room: Room, activePlayer: Player, target: Player) {
        return room.navigation.findFastestPath(activePlayer, target.position, room);
    }

    private checkForAttackItems(room: Room, reachability: Position[]) {
        const items = room.gameMap.itemPlacement;
        for (const tile of reachability) {
            if (this.isAttackItem(items[tile.x][tile.y])) {
                return tile;
            }
        }
        return this.checkForAnyItems(room, reachability);
    }

    private isAttackItem(item: ObjectType) {
        return item === ObjectType.Lightning || item === ObjectType.Xiphos || item === ObjectType.Sandal || item === ObjectType.Armor;
    }

    private checkForSpawn(reachability: Position[], player: Player) {
        for (const tile of reachability) {
            if (player.spawnPosition.x === tile.x && player.spawnPosition.y === tile.y) {
                return tile;
            }
        }
    }

    private checkForDefenseItems(room: Room, reachability: Position[]) {
        const items = room.gameMap.itemPlacement;
        for (const tile of reachability) {
            if (items[tile.x][tile.y] === ObjectType.Kunee || items[tile.x][tile.y] === ObjectType.Trident) {
                return tile;
            }
        }
        return this.checkForAnyItems(room, reachability);
    }

    private checkForAnyItems(room: Room, reachability: Position[]) {
        for (const tile of reachability) {
            if (room.gameMap.itemPlacement[tile.x][tile.y] !== 0 && room.gameMap.itemPlacement[tile.x][tile.y] !== ObjectType.Spawn) {
                return tile;
            }
        }
    }

    private async delay(timeMs: number) {
        return new Promise((resolve) => setTimeout(resolve, timeMs));
    }

    private getRandomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min) * MILLISECONDS_IN_SECOND;
    }
}
