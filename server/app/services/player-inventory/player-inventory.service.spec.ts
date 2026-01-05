import {
    DEFAULT_ACTION_POINT,
    DEFAULT_ATTRIBUTE,
    HIGH_ATTRIBUTE,
    INVENTORY_SIZE,
    MAX_ACTION_POINT,
    MAX_OBJECT_EFFECT,
    MIN_OBJECT_EFFECT,
    NO_ITEM,
} from '@app/constants';
import { InfoSwap } from '@app/interfaces/info-item-swap';
import { playerItemSwap } from '@app/mocks/mock-player';
import { mockPlayerInventory } from '@app/mocks/mock-players';
import { mockRoom } from '@app/mocks/mock-room';
import { GameLogsService } from '@app/services/game-logs/game-logs.service';
import { RoomService } from '@app/services/room/room.service';
import { ObjectType } from '@common/avatars-info';
import { Behavior, Player, Status } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { gameObjects } from '@common/objects-info';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { PlayerInventoryService } from './player-inventory.service';

/* eslint-disable max-lines */
describe('PlayerInventoryService', () => {
    let service: PlayerInventoryService;
    let mockRoomService: jest.Mocked<RoomService>;
    let mockLogsService: jest.Mocked<GameLogsService>;
    let mockClient: Socket;
    let mockServer: Server;
    let mockInfoSwap: InfoSwap;
    let itemPlacement: number[][];
    let room: Room;

    beforeEach(async () => {
        room = JSON.parse(JSON.stringify(mockRoom));
        mockClient = { id: 'admin', data: { roomCode: '1234' }, to: jest.fn().mockReturnThis(), emit: jest.fn() } as unknown as Socket;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        mockRoomService = {
            getRoom: jest.fn().mockReturnValue(room),
            getTurnTimer: jest.fn().mockReturnValue({
                pauseTimer: jest.fn(),
            }),
        } as unknown as jest.Mocked<RoomService>;

        mockLogsService = {
            sendItemLog: jest.fn(),
        } as unknown as jest.Mocked<GameLogsService>;

        mockInfoSwap = {
            server: mockServer,
            client: mockClient,
            player: JSON.parse(JSON.stringify(playerItemSwap)),
            oldInventory: [],
            modifiedInventory: [],
            droppedItem: ObjectType.Kunee,
        } as unknown as InfoSwap;
        room.listPlayers.push(mockInfoSwap.player);

        itemPlacement = [
            [ObjectType.Xiphos, NO_ITEM],
            [ObjectType.Sandal, NO_ITEM],
        ];

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlayerInventoryService,
                { provide: RoomService, useValue: mockRoomService },
                { provide: GameLogsService, useValue: mockLogsService },
            ],
        }).compile();

        service = module.get<PlayerInventoryService>(PlayerInventoryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('updateInventory', () => {
        it('should determine random item and handle swap', () => {
            service['handleItemSwap'] = jest.fn();
            service['determineRandomItem'] = jest.fn();
            itemPlacement[0][0] = ObjectType.Random;
            service.updateInventory(mockInfoSwap, itemPlacement);
            expect(service['determineRandomItem']).toHaveBeenCalledWith(itemPlacement, room);
            expect(service['handleItemSwap']).toHaveBeenCalled();
        });

        it('should update inventory', () => {
            mockInfoSwap.player.inventory = [gameObjects[0]];
            service['updatePlayerWithItem'] = jest.fn().mockReturnValue(mockInfoSwap.player);
            service.updateInventory(mockInfoSwap, itemPlacement);
            expect(service['updatePlayerWithItem']).toHaveBeenCalled();
            expect(mockLogsService['sendItemLog']).toHaveBeenCalled();
        });
    });

    it('should call updateItemEffects on addStatsFromItem', () => {
        service['updateItemEffects'] = jest.fn();
        service.addStatsFromItem(mockInfoSwap.player, ObjectType.Trident);
        expect(service['updateItemEffects']).toHaveBeenCalledWith(mockInfoSwap.player, ObjectType.Trident, true);
    });

    it('should call updateItemEffects on removeItemEffects', () => {
        service['updateItemEffects'] = jest.fn();
        service.removeItemEffects(mockInfoSwap.player, ObjectType.Trident);
        expect(service['updateItemEffects']).toHaveBeenCalledWith(mockInfoSwap.player, ObjectType.Trident, false);
    });

    it('should return player on updatePlayerAfterSwap', () => {
        service['getSwappedItem'] = jest.fn().mockReturnValue(ObjectType.Trident);
        service['addUniqueItemToHistory'] = jest.fn();
        service['handleItemEffectOnSwap'] = jest.fn();
        room.listPlayers[0].id = mockClient.id;
        service.updatePlayerAfterSwap(mockInfoSwap);
        expect(service['getSwappedItem']).toHaveBeenCalledWith(mockInfoSwap);
        expect(mockLogsService['sendItemLog']).toHaveBeenCalled();
        expect(service['addUniqueItemToHistory']).toHaveBeenCalledWith(room.listPlayers[0], ObjectType.Trident);
    });

    it('should return the id of the new item in modifiedInventory', () => {
        mockInfoSwap.oldInventory = [gameObjects[0]];
        mockInfoSwap.modifiedInventory = [gameObjects[2]];
        const result = service['getSwappedItem'](mockInfoSwap);
        expect(result).toBe(ObjectType.Sandal);
    });

    it('should handleItemEffectOnSwap', () => {
        mockInfoSwap.oldInventory = [gameObjects[0], gameObjects[2]];
        mockInfoSwap.modifiedInventory = [gameObjects[0], gameObjects[2]];
        service['removeItemEffects'] = jest.fn();
        service['addStatsFromItem'] = jest.fn();

        service['handleItemEffectOnSwap'](mockInfoSwap.player, mockInfoSwap);
        expect(service['removeItemEffects']).toHaveBeenCalledTimes(2);
        expect(service['addStatsFromItem']).toHaveBeenCalledTimes(2);
    });

    describe('updateArmorEffect', () => {
        it('should increase attack when armor effect is applied', () => {
            const player = { attributes: { attack: 4 } } as Player;
            service['updateArmorEffect'](player, true);
            expect(player.attributes.attack).toBe(HIGH_ATTRIBUTE);
        });

        it('should decrease attack when armor effect is removed', () => {
            const player = { attributes: { attack: 6 } } as Player;
            service['updateArmorEffect'](player, false);
            expect(player.attributes.attack).toBe(DEFAULT_ATTRIBUTE);
        });
    });

    describe('updateSandalEffects', () => {
        beforeEach(() => {
            mockInfoSwap.player.attributes.speed = DEFAULT_ATTRIBUTE;
            mockInfoSwap.player.attributes.currentHp = DEFAULT_ATTRIBUTE;
            mockInfoSwap.player.attributes.totalHp = DEFAULT_ATTRIBUTE;
        });

        it('should update speed, currentHp, and totalHp when sandals effect is applied', () => {
            service['updateSandalEffects'](mockInfoSwap.player, true);
            expect(mockInfoSwap.player.attributes.speed).toBe(DEFAULT_ATTRIBUTE * MAX_OBJECT_EFFECT);
            expect(mockInfoSwap.player.attributes.currentHp).toBe(DEFAULT_ATTRIBUTE - MIN_OBJECT_EFFECT);
            expect(mockInfoSwap.player.attributes.totalHp).toBe(DEFAULT_ATTRIBUTE - MIN_OBJECT_EFFECT);
        });

        it('should revert speed, currentHp, and totalHp when sandals effect is removed', () => {
            service['updateSandalEffects'](mockInfoSwap.player, false);
            expect(mockInfoSwap.player.attributes.speed).toBe(DEFAULT_ATTRIBUTE / MAX_OBJECT_EFFECT);
            expect(mockInfoSwap.player.attributes.currentHp).toBe(DEFAULT_ATTRIBUTE + MIN_OBJECT_EFFECT);
            expect(mockInfoSwap.player.attributes.totalHp).toBe(DEFAULT_ATTRIBUTE + MIN_OBJECT_EFFECT);
        });
    });

    describe('updateLightningEffects', () => {
        beforeEach(() => {
            mockInfoSwap.player.attributes.attack = DEFAULT_ATTRIBUTE;
            mockInfoSwap.player.attributes.defense = DEFAULT_ATTRIBUTE;
            mockInfoSwap.player.attributes.currentHp = DEFAULT_ATTRIBUTE;
            mockInfoSwap.player.attributes.totalHp = DEFAULT_ATTRIBUTE;
        });
        it('should update speed, currentHp, and totalHp when sandals effect is applied', () => {
            service['updateLightningEffects'](mockInfoSwap.player, true);
            expect(mockInfoSwap.player.attributes.attack).toBe(DEFAULT_ATTRIBUTE * MAX_OBJECT_EFFECT);
            expect(mockInfoSwap.player.attributes.defense).toBe(DEFAULT_ATTRIBUTE - MAX_OBJECT_EFFECT);
            expect(mockInfoSwap.player.attributes.currentHp).toBe(DEFAULT_ATTRIBUTE - MIN_OBJECT_EFFECT);
            expect(mockInfoSwap.player.attributes.totalHp).toBe(DEFAULT_ATTRIBUTE - MIN_OBJECT_EFFECT);
        });

        it('should revert speed, currentHp, and totalHp when sandals effect is removed', () => {
            service['updateLightningEffects'](mockInfoSwap.player, false);
            expect(mockInfoSwap.player.attributes.attack).toBe(DEFAULT_ATTRIBUTE / MAX_OBJECT_EFFECT);
            expect(mockInfoSwap.player.attributes.defense).toBe(DEFAULT_ATTRIBUTE + MAX_OBJECT_EFFECT);
            expect(mockInfoSwap.player.attributes.currentHp).toBe(DEFAULT_ATTRIBUTE + MIN_OBJECT_EFFECT);
            expect(mockInfoSwap.player.attributes.totalHp).toBe(DEFAULT_ATTRIBUTE + MIN_OBJECT_EFFECT);
        });
    });

    describe('removeTridentEffects', () => {
        it('should increase maxActionPoints when trident effect is applied', () => {
            const player = { attributes: { maxActionPoints: 1 } } as Player;
            service['removeTridentEffects'](player, true);
            expect(player.attributes.maxActionPoints).toBe(DEFAULT_ACTION_POINT + MIN_OBJECT_EFFECT);
        });

        it('should decrease actionPoints and maxActionPoints when trident effect is removed', () => {
            const player = { attributes: { actionPoints: 2, maxActionPoints: 2 } } as Player;
            service['removeTridentEffects'](player, false);
            expect(player.attributes.actionPoints).toBe(MAX_ACTION_POINT - MIN_OBJECT_EFFECT);
            expect(player.attributes.maxActionPoints).toBe(MAX_ACTION_POINT - MIN_OBJECT_EFFECT);
        });
    });

    describe('updateItemEffects', () => {
        it('should call updateArmorEffect when itemId is Armor', () => {
            service['updateArmorEffect'] = jest.fn();
            service['updateItemEffects'](mockInfoSwap.player, ObjectType.Armor, true);
            expect(service['updateArmorEffect']).toHaveBeenCalledWith(mockInfoSwap.player, true);
        });

        it('should call updateSandalEffects when itemId is Sandal', () => {
            service['updateSandalEffects'] = jest.fn();
            service['updateItemEffects'](mockInfoSwap.player, ObjectType.Sandal, true);
            expect(service['updateSandalEffects']).toHaveBeenCalledWith(mockInfoSwap.player, true);
        });

        it('should call updateLightningEffects when itemId is Lightning', () => {
            service['updateLightningEffects'] = jest.fn();
            service['updateItemEffects'](mockInfoSwap.player, ObjectType.Lightning, true);
            expect(service['updateLightningEffects']).toHaveBeenCalledWith(mockInfoSwap.player, true);
        });

        it('should call removeTridentEffects when itemId is Trident', () => {
            service['removeTridentEffects'] = jest.fn();
            service['updateItemEffects'](mockInfoSwap.player, ObjectType.Trident, true);
            expect(service['removeTridentEffects']).toHaveBeenCalledWith(mockInfoSwap.player, true);
        });

        it('should call not call when itemId is unknown', () => {
            service['updateArmorEffect'] = jest.fn();
            service['updateSandalEffects'] = jest.fn();
            service['updateLightningEffects'] = jest.fn();
            service['removeTridentEffects'] = jest.fn();

            service['updateItemEffects'](mockInfoSwap.player, ObjectType.Spawn, true);
            expect(service['updateArmorEffect']).not.toHaveBeenCalledWith(mockInfoSwap.player, true);
            expect(service['updateSandalEffects']).not.toHaveBeenCalledWith(mockInfoSwap.player, true);
            expect(service['updateLightningEffects']).not.toHaveBeenCalledWith(mockInfoSwap.player, true);
            expect(service['removeTridentEffects']).not.toHaveBeenCalledWith(mockInfoSwap.player, true);
        });
    });

    it('should return a set with unique item IDs when players have non-empty inventories', () => {
        const result = service['getItemsInInventories']([mockInfoSwap.player]);
        expect(result.size).toBe(INVENTORY_SIZE);
        expect(result).toContain(ObjectType.Trident);
        expect(result).toContain(ObjectType.Lightning);
    });

    it('should return a set with unique item IDs when grid contains valid items', () => {
        const result = service['getItemsFromGrid'](itemPlacement);
        expect(result.size).toBe(INVENTORY_SIZE);
        expect(result.has(ObjectType.Xiphos)).toBe(true);
        expect(result.has(ObjectType.Sandal)).toBe(true);
    });

    it('should return available items excluding those already in inventory', () => {
        service['getItemsInInventories'] = jest.fn().mockReturnValue(new Set([ObjectType.Xiphos, ObjectType.Sandal]));
        service['getItemsFromGrid'] = jest.fn().mockReturnValue(new Set([ObjectType.Lightning, ObjectType.Armor]));

        const result = service['getAvailableItems'](itemPlacement, room);

        expect(result.length).toBe(INVENTORY_SIZE);
        expect(result).toContain(ObjectType.Trident);
    });

    it('should return player on updatePlayerWithItem', () => {
        service.addStatsFromItem = jest.fn();
        service['addUniqueItemToHistory'] = jest.fn();
        service['updatePlayerWithItem'](mockInfoSwap.player, ObjectType.Trident);
        expect(service['addUniqueItemToHistory']).toHaveBeenCalled();
        expect(service.addStatsFromItem).toHaveBeenCalled();
    });

    it('should return the first item when random() is 0', () => {
        Math.random = jest.fn().mockReturnValue(0);
        service['getAvailableItems'] = jest.fn().mockReturnValue([ObjectType.Lightning]);
        const result = service['determineRandomItem'](itemPlacement, room);
        expect(result).toBe(ObjectType.Lightning);
    });

    it('should add item to collectedItem', () => {
        mockInfoSwap.player.collectedItems = [ObjectType.Lightning];
        service['addUniqueItemToHistory'](mockInfoSwap.player, ObjectType.Trident);
        expect(mockInfoSwap.player.collectedItems).toContain(ObjectType.Trident);
    });

    it('should update the inventory when the dropped item is not the same as the picked up item', () => {
        service['determineItemToDrop'] = jest.fn().mockReturnValue(gameObjects[0]);
        service['getPrioritizedItem'](mockInfoSwap, ObjectType.Armor);
        expect(mockInfoSwap.modifiedInventory).toEqual([gameObjects[3], gameObjects[1]]);
    });

    describe('determineItemToDrop', () => {
        let player;
        beforeEach(() => {
            player = JSON.parse(JSON.stringify(playerItemSwap));
        });
        it('should return the correct item to drop for a defensive player with a defense item', () => {
            player.behavior = Behavior.Defensive;
            service['isDefenseItem'] = jest.fn().mockReturnValue(true);
            service['determineItemToDropDefensive'] = jest.fn().mockReturnValue(gameObjects[1]);

            const result = service['determineItemToDrop'](player.inventory, ObjectType.Armor, player);

            expect(service['isDefenseItem']).toHaveBeenCalledWith(gameObjects[1]);
            expect(service['determineItemToDropDefensive']).toHaveBeenCalledWith(player.inventory, gameObjects[1]);
            expect(result).toEqual(gameObjects[1]);
        });

        it('should return the correct item to drop for a Aggressive player with a attack item', () => {
            player.behavior = Behavior.Aggressive;
            service['isAttackItem'] = jest.fn().mockReturnValue(true);
            service['determineItemToDropAggressive'] = jest.fn().mockReturnValue(gameObjects[1]);

            const result = service['determineItemToDrop'](player.inventory, ObjectType.Armor, player);

            expect(service['isAttackItem']).toHaveBeenCalledWith(gameObjects[1]);
            expect(service['determineItemToDropAggressive']).toHaveBeenCalledWith(player.inventory, gameObjects[1]);
            expect(result).toEqual(gameObjects[1]);
        });

        it('should return the correct item to drop for real player', () => {
            const result = service['determineItemToDrop'](player.inventory, ObjectType.Armor, player);
            expect(result).toEqual(gameObjects[1]);
        });
    });

    describe('handleItemSwap', () => {
        it('should update inventory and player for a bot', () => {
            mockInfoSwap.player.status = Status.Bot;
            service['getPrioritizedItem'] = jest.fn().mockReturnValue(mockInfoSwap);
            service['updatePlayerAfterSwap'] = jest.fn().mockReturnValue(playerItemSwap);

            service['handleItemSwap'](room, mockInfoSwap, ObjectType.Armor);
            expect(service['getPrioritizedItem']).toHaveBeenCalledWith(mockInfoSwap, ObjectType.Armor);
            expect(service['updatePlayerAfterSwap']).toHaveBeenCalledWith(mockInfoSwap);
        });

        it('should send event for player', () => {
            service['getPrioritizedItem'] = jest.fn().mockReturnValue(mockInfoSwap);
            service['updatePlayerAfterSwap'] = jest.fn().mockReturnValue(playerItemSwap);

            service['handleItemSwap'](room, mockInfoSwap, ObjectType.Armor);
            expect(service['getPrioritizedItem']).not.toHaveBeenCalled();
            expect(service['updatePlayerAfterSwap']).not.toHaveBeenCalled();
            expect(mockRoomService.getTurnTimer(room.roomId).pauseTimer).toHaveBeenCalled();
        });
    });

    describe('determineItemToDropDefensive', () => {
        it('should return first object in inventory', () => {
            service['isDefenseItem'] = jest.fn().mockReturnValue(true);
            const result = service['determineItemToDropDefensive']([gameObjects[0]], gameObjects[0]);
            expect(result).toEqual(gameObjects[0]);
        });

        it('should return second object in inventory', () => {
            service['isDefenseItem'] = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);
            const result = service['determineItemToDropDefensive']([gameObjects[0], gameObjects[1]], gameObjects[0]);
            expect(result).toEqual(gameObjects[1]);
        });

        it('should return picked up object', () => {
            service['isDefenseItem'] = jest.fn().mockReturnValue(false);
            const result = service['determineItemToDropDefensive']([], gameObjects[0]);
            expect(result).toEqual(gameObjects[0]);
        });
    });

    describe('determineItemToDropAggressive', () => {
        it('should return first object in inventory', () => {
            service['isAttackItem'] = jest.fn().mockReturnValue(false);
            const result = service['determineItemToDropAggressive']([gameObjects[0]], gameObjects[0]);
            expect(result).toEqual(gameObjects[0]);
        });

        it('should return second object in inventory', () => {
            service['isAttackItem'] = jest.fn().mockReturnValueOnce(true).mockReturnValue(false);
            const result = service['determineItemToDropAggressive']([gameObjects[0], gameObjects[1]], gameObjects[0]);
            expect(result).toEqual(gameObjects[1]);
        });

        it('should return picked up object', () => {
            service['isAttackItem'] = jest.fn().mockReturnValue(true);
            const result = service['determineItemToDropAggressive']([], gameObjects[0]);
            expect(result).toEqual(gameObjects[0]);
        });
    });

    it('should set stat to default', () => {
        const player = JSON.parse(JSON.stringify(mockPlayerInventory[0]));
        service.restoreInitialStats(player);
        expect(player.attributes.attack).toEqual(player.attributes.initialAttack);
    });
});
