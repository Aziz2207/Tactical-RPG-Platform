import { ActiveSession } from '@app/interfaces/active-session';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { TileValidityService } from '@app/services/tile-validity/tile-validity.service';
import { TurnService } from '@app/services/turn/turn.service';
import { directions } from '@common/directions';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { Item, itemProperties } from '@common/interfaces/item';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { Tile, tileProperties } from '@common/interfaces/tile';
import { ItemEnum } from '@common/item-enum';
import { TileEnum } from '@common/tile-enum';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ActionsService {
    offensiveItems: ItemEnum[] = [ItemEnum.ABomb, ItemEnum.Potion];
    defensiveItems: ItemEnum[] = [ItemEnum.Battery, ItemEnum.NanoBot];
    uniqueItems: ItemEnum[] = [ItemEnum.ABomb, ItemEnum.Battery, ItemEnum.Chip, ItemEnum.NanoBot, ItemEnum.Pic, ItemEnum.Potion];
    mapItems: ItemEnum[] = [];

    constructor(
        private tileValidityService: TileValidityService,
        private infoService: GameInfoService,
        private turnService: TurnService,
    ) {}

    updatePlayerAttributes(socketId: string, session: ActiveSession, newInventory: Item[], server: Server): void {
        const player = session.room.players.find((inRoomPlayer: Player) => inRoomPlayer.socketId === socketId);
        const addedItem = newInventory.filter((newItem) => !player.inventory.some((oldItem) => oldItem.itemType === newItem.itemType))[0];
        const removedItems = player.inventory.filter((oldItem) => !newInventory.some((newItem) => oldItem.itemType === newItem.itemType));
        player.inventory = newInventory;
        if (!addedItem) return;
        if (addedItem.itemType === 'potion') {
            player.attributes.lifePoints -= 1;
            player.attributes.speedPoints += 2;
        }
        if (addedItem.itemType === 'battery') {
            player.attributes.offensePoints += 2;
            player.attributes.defensePoints -= 1;
        }
        if (addedItem.itemType === 'flag') {
            this.infoService.addFlagHolder(session.room.code, player.socketId);
        }
        this.loggMessageItem(addedItem, player, session, server);
        server.to(session.room.code).emit(GameLogicEvents.UpdateAttribute, player.attributes);
        this.infoService.incrementItemsCollected(session.room.code, player.socketId);
        this.resetPlayerAttributes(removedItems, player, session, server);
        if (addedItem.itemType === ItemEnum.Flag) {
            player.hasFlag = true;
            server.to(session.room.code).emit(GameLogicEvents.UpdateFlag, player);
        }
    }

    loggMessageItem(newItem: Item, player: Player, session: ActiveSession, server: Server): void {
        const logMessage = this.infoService.createLog(
            `${player.userName} a rammassé l'item : ${newItem.itemType}`,
            [player.socketId],
            session.room.code,
        );
        this.infoService.sendToAllPlayers(server, logMessage, session.room.code);
    }

    resetPlayerAttributes(removedItems: Item[], player: Player, session: ActiveSession, server: Server): void {
        for (const item of removedItems) {
            if (item.itemType === 'potion') {
                player.attributes.lifePoints += 1;
                player.attributes.speedPoints -= 2;
            }
            if (item.itemType === 'battery') {
                player.attributes.offensePoints -= 2;
                player.attributes.defensePoints += 1;
            }
        }
        server.to(session.room.code).emit(GameLogicEvents.UpdateAttribute, player.attributes);
    }

    hasChipItem(player: Player): boolean {
        return player.inventory.some((item) => item.itemType === 'chip');
    }

    hasPicItem(player: Player): boolean {
        return player.inventory.some((item) => item.itemType === 'pic');
    }

    getAttackBonus(attacker: Player): number {
        return attacker.inventory.some((item) => item.itemType === 'a-bomb') && attacker.attributes.currentHP === 1 ? 2 : 1;
    }

    getDefenseBonus(attacker: Player, defender: Player): number {
        return defender.inventory.some((item) => item.itemType === 'nano-bot') && attacker.nbWins === 2 ? 2 : 1;
    }

    checkForMystery(tiles: Tile[][]) {
        this.getMapItems(tiles);
        tiles.forEach((row: Tile[]) => {
            row.forEach((tile: Tile) => {
                if (tile.item && tile.item.itemType === 'mystery') {
                    let possibleNames = this.uniqueItems.filter((uniqueItem) => !this.mapItems.some((mapItem) => mapItem === uniqueItem));
                    const randomName = possibleNames[Math.floor(Math.random() * possibleNames.length)];

                    tile.item = {
                        itemType: randomName,
                        imgSrc: itemProperties[randomName].imgSrc,
                        isRandom: itemProperties[randomName].isRandom,
                        id: tile.item.id,
                        isOnGrid: true,
                        description: itemProperties[randomName].description,
                        hasEffect: itemProperties[randomName].hasEffect,
                    };
                    this.mapItems.push(randomName);
                    possibleNames = possibleNames.filter((possibleItem) => randomName !== possibleItem);
                }
            });
        });
        this.mapItems = [];
    }

    getMapItems(tiles: Tile[][]): void {
        tiles.forEach((row: Tile[]) => {
            row.forEach((tile: Tile) => {
                const item = tile.item;
                if (item && item.itemType !== 'mystery' && item.hasEffect) {
                    this.mapItems.push(item.itemType);
                }
            });
        });
    }

    handleCombatEnd(player: Player, session: ActiveSession, server: Server): void {
        const map = session.room.map;
        const nearestPositions = this.tileValidityService.calculateNearestPosition(player, map);
        let index = 0;
        for (const position of nearestPositions) {
            map._tiles[position.y][position.x].item = player.inventory[index];
            index++;
        }
        this.resetPlayerAttributes(player.inventory, player, session, server);
        player.inventory = [];
        server.to(session.room.code).emit(GameLogicEvents.NewInventory, player.inventory);
        server.to(session.room.code).emit(GameLogicEvents.UpdateMap, map);
    }

    handleVirtualPlayerInventory(currentPlayer: Player, newItem: Item, session: ActiveSession, server: Server): Item | undefined {
        let discardedItem: Item | undefined;
        if (currentPlayer.inventory.length >= 2) {
            const allItems = [...currentPlayer.inventory, newItem];
            const updatedInventory = this.prioritizeItems(currentPlayer, newItem);
            discardedItem = allItems.find((item) => !updatedInventory.includes(item));
            this.updatePlayerAttributes(currentPlayer.socketId, session, updatedInventory, server);
        } else {
            currentPlayer.inventory.push(newItem);
        }
        this.infoService.incrementItemsCollected(session.room.code, currentPlayer.socketId);
        return discardedItem;
    }

    prioritizeItems(player: Player, newItem: Item): Item[] {
        const allItems = [...player.inventory, newItem];
        const priorityList = player.isAgressive ? this.offensiveItems : this.defensiveItems;

        const prioritizedItems = allItems.filter((item: Item) => priorityList.includes(item.itemType));
        const nonPrioritizedItems = allItems.filter((item: Item) => !priorityList.includes(item.itemType));

        const finalInventory: Item[] = [...prioritizedItems];

        while (finalInventory.length < 2 && nonPrioritizedItems.length > 0) {
            const randomIndex = Math.floor(Math.random() * nonPrioritizedItems.length);
            finalInventory.push(nonPrioritizedItems.splice(randomIndex, 1)[0]);
        }

        return finalInventory.slice(0, 2);
    }

    toggleDoor(socketId: string, session: ActiveSession, pos: Position, server: Server) {
        const player = session.room.players.find((inRoomPlayer: Player) => inRoomPlayer.socketId === socketId);
        const map = session.room.map;
        if (!player || !map) return;

        if (this.tileValidityService.isAdjascent(player, pos) && !player.hasActed) {
            const tile = map._tiles[pos.y][pos.x];
            if (tile._tileType === TileEnum.ClosedDoor) {
                this.toggleTileToOther(tile, TileEnum.OpenDoor, session, server);
                player.hasActed = true;
                this.infoService.doorLog(true, player, session.room.code, server);
                this.infoService.addToggledDoor(session.room.code, `${pos.x},${pos.y}`);
                this.infoService.calculateDoorsToggled(session.room.code, this.tileValidityService.countDoors(map));
            } else if (tile._tileType === TileEnum.OpenDoor && !tile.player) {
                this.toggleTileToOther(tile, TileEnum.ClosedDoor, session, server);
                player.hasActed = true;
                this.infoService.doorLog(false, player, session.room.code, server);
                this.infoService.addToggledDoor(session.room.code, `${pos.x},${pos.y}`);
                this.infoService.calculateDoorsToggled(session.room.code, this.tileValidityService.countDoors(map));
            }
            this.canStillActCheck(player, map, session, server);
        }
    }

    toggleTileToOther(tile: Tile, tileType: TileEnum, session: ActiveSession, server: Server) {
        tile._tileType = tileType;
        tile.imageSrc = tileProperties[TileEnum.OpenDoor].imageSrc;
        server.to(session.room.code).emit(GameLogicEvents.UpdateMap, session.room.map);
        const reachableTiles = this.tileValidityService.getReachableTiles(session.room.map, session.room.players[session.turnIndex]);
        server.to(session.room.code).emit('availableTiles', reachableTiles);
    }

    playerHasNearbyAction(player: Player, grid: Tile[][]): boolean {
        let nearbyAction = false;
        let nearbyMovePossible = false;
        if (!player.position) return false;
        for (const [dx, dy] of directions) {
            const position: Position = { x: player.position.x + dx, y: player.position.y + dy };
            if (this.tileValidityService.boundsCheck(position, grid)) {
                const tile = grid[position.y][position.x];
                const tileHasAction = !!tile.player || tile._tileType === TileEnum.ClosedDoor || tile._tileType === TileEnum.OpenDoor;
                nearbyAction = nearbyAction || tileHasAction;
                const directionMovePossible = tileProperties[grid[position.y][position.x]._tileType].weight <= player.attributes.currentSpeed;
                nearbyMovePossible = nearbyMovePossible || directionMovePossible;
            }
        }
        return (nearbyAction && !player.hasActed) || nearbyMovePossible;
    }

    canStillActCheck(player: Player, map: Map, session: ActiveSession, server: Server): void {
        if (!this.playerHasNearbyAction(player, map._tiles)) this.turnService.endTurn(session, server);
    }

    playerCanDoAction(player: Player, session: ActiveSession): boolean {
        return !player.hasActed && this.playerHasNearbyAction(player, session.room.map?._tiles) && this.turnService.hasTurn(session, player.socketId);
    }
}
