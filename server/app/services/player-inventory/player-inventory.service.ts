import {
    ADD_OBEJCT_EFFECT_FACTOR,
    INVENTORY_SIZE,
    MAX_OBJECT_EFFECT,
    MIN_OBJECT_EFFECT,
    NO_ITEM,
    REMOVE_OBEJECT_EFFECT_FACTOR,
} from '@app/constants';
import { InfoSwap } from '@app/interfaces/info-item-swap';
import { GameLogsService } from '@app/services/game-logs/game-logs.service';
import { RoomService } from '@app/services/room/room.service';
import { ObjectType } from '@common/avatars-info';
import { GameObject } from '@common/interfaces/game-object';
import { Behavior, Player, Status } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { gameObjects } from '@common/objects-info';
import { ServerToClientEvent } from '@common/socket.events';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerInventoryService {
    constructor(
        private roomService: RoomService,
        private gameLogService: GameLogsService,
    ) {}

    updateInventory(info: InfoSwap, allItems: number[][]) {
        const room = this.roomService.getRoom(info.client);
        let itemPickedUp = allItems[info.player.position.x][info.player.position.y];
        if (itemPickedUp === ObjectType.Random) {
            itemPickedUp = this.determineRandomItem(allItems, room);
        }
        if (info.player.inventory.length === INVENTORY_SIZE) {
            this.handleItemSwap(room, info, itemPickedUp);
            return;
        } else {
            info.player = this.updatePlayerWithItem(info.player, itemPickedUp);
            this.gameLogService.sendItemLog(info.player, room.roomId, info.server, itemPickedUp);
            room.gameMap.itemPlacement[info.player.position.x][info.player.position.y] = 0;
        }
        const index = room.listPlayers.findIndex((players) => players.uid === info.player.uid);
        room.listPlayers[index].attributes = info.player.attributes;
        room.listPlayers[index].inventory = info.player.inventory;

        info.server.to(room.roomId).emit(ServerToClientEvent.UpdateAllPlayers, room.listPlayers);
        info.client.emit(ServerToClientEvent.UpdatedInventory, info.player);
    }

    addStatsFromItem(playerToBuff: Player, itemId: number) {
        this.updateItemEffects(playerToBuff, itemId, true);
    }

    removeItemEffects(player: Player, itemToUndo: number) {
        this.updateItemEffects(player, itemToUndo, false);
    }

    restoreInitialStats(player: Player) {
        player.attributes.totalHp = player.attributes.initialHp;
        player.attributes.currentHp = player.attributes.initialHp;
        player.attributes.speed = player.attributes.initialSpeed;
        player.attributes.attack = player.attributes.initialAttack;
        player.attributes.defense = player.attributes.initialDefense;
    }

    updatePlayerAfterSwap(infoSwap: InfoSwap) {
        const room = this.roomService.getRoom(infoSwap.client);
        const playerToUpdate = room.listPlayers.find((player) => player.uid === infoSwap.client.data.userId);
        const newItem = this.getSwappedItem(infoSwap);
        this.handleItemEffectOnSwap(playerToUpdate, infoSwap);
        if (newItem > 0) {
            this.gameLogService.sendItemLog(playerToUpdate, room.roomId, infoSwap.server, newItem);
        }

        room.gameMap.itemPlacement[playerToUpdate.position.x][playerToUpdate.position.y] = infoSwap.droppedItem;
        const index = room.listPlayers.findIndex((players) => players.uid === playerToUpdate.uid);
        room.listPlayers[index].attributes = playerToUpdate.attributes;
        room.listPlayers[index].inventory = playerToUpdate.inventory;

        this.addUniqueItemToHistory(playerToUpdate, newItem);
        infoSwap.server.to(room.roomId).emit(ServerToClientEvent.UpdateObjects, room.gameMap.itemPlacement);
        infoSwap.client.to(room.roomId).emit(ServerToClientEvent.UpdatedInventory, playerToUpdate);
        return playerToUpdate;
    }

    private getSwappedItem(infoSwap: InfoSwap) {
        for (const items of infoSwap.modifiedInventory) {
            if (!infoSwap.oldInventory.find((oldItems) => oldItems.id === items.id)) {
                return items.id;
            }
        }
    }

    private handleItemEffectOnSwap(playerToUpdate: Player, infoSwap: InfoSwap) {
        this.removeItemEffects(playerToUpdate, infoSwap.oldInventory[0].id);
        this.removeItemEffects(playerToUpdate, infoSwap.oldInventory[1].id);
        playerToUpdate.inventory = infoSwap.modifiedInventory;
        this.addStatsFromItem(playerToUpdate, infoSwap.modifiedInventory[0].id);
        this.addStatsFromItem(playerToUpdate, infoSwap.modifiedInventory[1].id);
    }

    private updateArmorEffect(player: Player, isApplied: boolean) {
        const factor = isApplied ? ADD_OBEJCT_EFFECT_FACTOR : REMOVE_OBEJECT_EFFECT_FACTOR;
        player.attributes.attack += factor * MAX_OBJECT_EFFECT;
    }

    private updateSandalEffects(player: Player, isApplied: boolean) {
        const factor = isApplied ? ADD_OBEJCT_EFFECT_FACTOR : REMOVE_OBEJECT_EFFECT_FACTOR;
        player.attributes.speed *= isApplied ? MAX_OBJECT_EFFECT : 1 / MAX_OBJECT_EFFECT;
        player.attributes.currentHp -= factor * MIN_OBJECT_EFFECT;
        player.attributes.totalHp -= factor * MIN_OBJECT_EFFECT;
    }

    private updateLightningEffects(player: Player, isApplied: boolean) {
        const factor = isApplied ? ADD_OBEJCT_EFFECT_FACTOR : REMOVE_OBEJECT_EFFECT_FACTOR;
        player.attributes.attack *= isApplied ? MAX_OBJECT_EFFECT : 1 / MAX_OBJECT_EFFECT;
        player.attributes.defense -= factor * MAX_OBJECT_EFFECT;
        player.attributes.currentHp -= factor * MIN_OBJECT_EFFECT;
        player.attributes.totalHp -= factor * MIN_OBJECT_EFFECT;
    }

    private removeTridentEffects(player: Player, isApplied: boolean) {
        if (isApplied) {
            player.attributes.maxActionPoints += MIN_OBJECT_EFFECT;
        } else {
            player.attributes.actionPoints -= MIN_OBJECT_EFFECT;
            player.attributes.maxActionPoints -= MIN_OBJECT_EFFECT;
        }
    }

    private updateItemEffects(player: Player, itemId: number, isApplied: boolean) {
        switch (itemId) {
            case ObjectType.Armor:
                this.updateArmorEffect(player, isApplied);
                break;
            case ObjectType.Sandal:
                this.updateSandalEffects(player, isApplied);
                break;
            case ObjectType.Lightning:
                this.updateLightningEffects(player, isApplied);
                break;
            case ObjectType.Trident:
                this.removeTridentEffects(player, isApplied);
                break;
            default:
                break;
        }
    }

    private getItemsInInventories(players: Player[]) {
        const items = new Set<number>();
        for (const player of players) {
            if (player.inventory.length > 0) {
                for (const item of player.inventory) {
                    items.add(item.id);
                }
            }
        }
        return items;
    }

    private getItemsFromGrid(allObjects: number[][]): Set<number> {
        const items = new Set<number>();
        for (const objectRows of allObjects) {
            for (const object of objectRows) {
                if (object !== NO_ITEM) {
                    items.add(object);
                }
            }
        }
        return items;
    }

    private getAvailableItems(allObjects: number[][], room: Room): number[] {
        const itemsNotAvailable: Set<number> = this.getItemsInInventories(room.listPlayers);
        const gridItems = this.getItemsFromGrid(allObjects);
        const availableItems: number[] = [];

        for (const item of gridItems) {
            itemsNotAvailable.add(item);
        }

        for (const object of gameObjects) {
            if (!itemsNotAvailable.has(object.id) && object.id < ObjectType.Random) {
                availableItems.push(object.id);
            }
        }
        return availableItems;
    }

    private updatePlayerWithItem(player: Player, item: number) {
        const fullItem = gameObjects.find((object) => object.id === item);
        if (fullItem) {
            player.inventory.push(fullItem);
            this.addStatsFromItem(player, fullItem.id);
            this.addUniqueItemToHistory(player, fullItem.id);
        }
        return player;
    }

    private determineRandomItem(allObjects: number[][], room: Room): number {
        const itemsAvailable = this.getAvailableItems(allObjects, room);
        const index = Math.floor(Math.random() * itemsAvailable.length);
        return itemsAvailable[index];
    }

    private addUniqueItemToHistory(player: Player, newItemId: number) {
        if (!player.collectedItems.some((item) => item === newItemId)) {
            player.collectedItems.push(newItemId);
        }
    }

    private getPrioritizedItem(info: InfoSwap, itemPickedUp: number): InfoSwap {
        const itemToDrop = this.determineItemToDrop(info.player.inventory, itemPickedUp, info.player);
        info.modifiedInventory = info.player.inventory.filter((item) => item.id !== itemToDrop.id);
        if (itemToDrop.id !== itemPickedUp) {
            info.modifiedInventory.push(gameObjects.find((object) => object.id === itemPickedUp));
        }
        info.droppedItem = itemToDrop.id;
        return info;
    }

    private determineItemToDrop(inventory: GameObject[], itemPickedUp: number, player: Player): GameObject {
        const itemPickedUpObject = gameObjects.find((object) => object.id === itemPickedUp);
        if (itemPickedUpObject && this.isDefenseItem(itemPickedUpObject) && player.behavior === Behavior.Defensive) {
            return this.determineItemToDropDefensive(inventory, itemPickedUpObject);
        } else if (itemPickedUpObject && this.isAttackItem(itemPickedUpObject) && player.behavior === Behavior.Aggressive) {
            return this.determineItemToDropAggressive(inventory, itemPickedUpObject);
        }
        return itemPickedUpObject;
    }

    private handleItemSwap(room: Room, info: InfoSwap, itemPickedUp: number) {
        if (info.player.status === Status.Bot) {
            info.oldInventory = info.player.inventory;
            info = this.getPrioritizedItem(info, itemPickedUp);
            info.player = this.updatePlayerAfterSwap(info);
            return;
        }
        this.roomService.getTurnTimer(room.roomId).pauseTimer();
        info.server.to(room.roomId).emit(ServerToClientEvent.UpdateAllPlayers, room.listPlayers);
        info.client.emit(ServerToClientEvent.OpenItemSwitchModal, { activePlayer: info.player, foundItem: itemPickedUp });
    }

    private determineItemToDropDefensive(inventory: GameObject[], itemPickedUpObject: GameObject) {
        if (this.isDefenseItem(inventory[0])) {
            return inventory[0];
        } else if (this.isDefenseItem(inventory[1])) {
            return inventory[1];
        } else {
            return itemPickedUpObject;
        }
    }

    private isDefenseItem(item: GameObject) {
        return item.id === ObjectType.Trident || item.id === ObjectType.Kunee;
    }

    private determineItemToDropAggressive(inventory: GameObject[], itemPickedUpObject: GameObject) {
        if (!this.isAttackItem(inventory[0])) {
            return inventory[0];
        } else if (!this.isAttackItem(inventory[1])) {
            return inventory[1];
        } else {
            return itemPickedUpObject;
        }
    }
    private isAttackItem(item: GameObject) {
        return item.id === ObjectType.Lightning || item.id === ObjectType.Xiphos || item.id === ObjectType.Sandal || item.id === ObjectType.Armor;
    }
}
