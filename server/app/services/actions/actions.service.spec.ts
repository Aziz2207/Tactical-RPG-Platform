import { ActiveSession } from '@app/interfaces/active-session';
import { TileValidityService } from '@app/services/tile-validity/tile-validity.service';
import { TurnService } from '@app/services/turn/turn.service';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { Item } from '@common/interfaces/item';
import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { Tile } from '@common/interfaces/tile';
import { ItemEnum } from '@common/item-enum';
import { TileEnum } from '@common/tile-enum';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { GameInfoService } from '../game-info/game-info.service';
import { ActionsService } from './actions.service';

describe('ActionsService', () => {
    let actionsService: ActionsService;
    let mockServer: jest.Mocked<Server>;
    let tileValidityService: jest.Mocked<TileValidityService>;
    let turnService: jest.Mocked<TurnService>;
    let gameLogService: jest.Mocked<GameInfoService>;

    let mockSession: ActiveSession;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActionsService,
                {
                    provide: GameInfoService,
                    useValue: {
                        createLog: jest.fn(),
                        sendToAllPlayers: jest.fn(),
                        doorLog: jest.fn(),
                        incrementItemsCollected: jest.fn(),
                        addFlagHolder: jest.fn(),
                        addToggledDoor: jest.fn(),
                        calculateDoorsToggled: jest.fn(),
                    },
                },
                {
                    provide: TileValidityService,
                    useValue: {
                        isAdjascent: jest.fn(),
                        calculateNearestPosition: jest.fn(),
                        boundsCheck: jest.fn(),
                        getReachableTiles: jest.fn(),
                        countDoors: jest.fn(),
                    },
                },
                { provide: TurnService, useValue: { endTurn: jest.fn(), hasTurn: jest.fn().mockReturnValue(true) } },
            ],
        }).compile();

        actionsService = module.get<ActionsService>(ActionsService);
        turnService = module.get(TurnService) as jest.Mocked<TurnService>;
        gameLogService = module.get(GameInfoService) as jest.Mocked<GameInfoService>;

        tileValidityService = module.get(TileValidityService) as jest.Mocked<TileValidityService>;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        mockSession = {
            movementUnlocked: true,
            room: {
                code: 'room1',
                players: [
                    {
                        socketId: 'player1',
                        userName: '',
                        inventory: [
                            { id: 0, itemType: ItemEnum.Chip, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                            { id: 0, itemType: ItemEnum.Pic, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                        ],
                        attributes: {
                            lifePoints: 5,
                            speedPoints: 3,
                            offensePoints: 1,
                            defensePoints: 2,
                            currentHP: 5,
                            currentSpeed: 3,
                            diceChoice: 'attack',
                            actionLeft: 1,
                        },
                        position: { x: 1, y: 0 },
                        hasActed: false,
                        characterType: '',
                        isHost: false,
                        nbWins: 0,
                    },
                    {
                        socketId: 'player2',
                        userName: '',
                        inventory: [
                            { id: 0, itemType: ItemEnum.Potion, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                            { id: 0, itemType: ItemEnum.Battery, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                        ],
                        attributes: {
                            lifePoints: 5,
                            speedPoints: 3,
                            offensePoints: 1,
                            defensePoints: 2,
                            currentHP: 5,
                            currentSpeed: 3,
                            diceChoice: 'attack',
                            actionLeft: 1,
                        },
                        position: { x: 0, y: 0 },
                        hasActed: false,
                        characterType: '',
                        isHost: false,
                        nbWins: 0,
                    },
                ],
                map: {
                    _tiles: Array(3)
                        .fill(null)
                        .map(() =>
                            Array(3)
                                .fill(null)
                                .map(() => ({
                                    _tileType: TileEnum.ClosedDoor,
                                    player: undefined,
                                })),
                        ),
                },
            },
        } as unknown as ActiveSession;
    });

    describe('updatePlayerAttributes', () => {
        it('should update player inventory for potion', () => {
            const player: Player = mockSession.room.players[0];
            const session: ActiveSession = mockSession;
            const server: Server = mockServer;

            const newInventory: Item[] = [
                { id: 0, itemType: ItemEnum.Potion, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                { id: 1, itemType: ItemEnum.Pic, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
            ];

            actionsService.updatePlayerAttributes(player.socketId, session, newInventory, server);

            expect(player.inventory).toEqual(newInventory);
            expect(player.attributes.lifePoints).toBe(4); // Potion decreases lifePoints by 1
            expect(player.attributes.speedPoints).toBe(5); // Potion increases speedPoints by 2
        });
        it('should update player inventory for battery', () => {
            const player: Player = mockSession.room.players[0];
            const session: ActiveSession = mockSession;
            const server: Server = mockServer;

            const newInventory: Item[] = [
                { id: 0, itemType: ItemEnum.Battery, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                { id: 1, itemType: ItemEnum.Pic, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
            ];

            actionsService.updatePlayerAttributes(player.socketId, session, newInventory, server);

            expect(player.inventory).toEqual(newInventory);
            expect(player.attributes.offensePoints).toBe(3);
            expect(player.attributes.defensePoints).toBe(1);
        });

        it('should emit UpdateAttribute event to server', () => {
            const player: Player = mockSession.room.players[0];
            const session: ActiveSession = mockSession;
            const server: Server = mockServer;

            const newInventory: Item[] = [
                { id: 0, itemType: ItemEnum.Potion, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
            ];

            actionsService.updatePlayerAttributes(player.socketId, session, newInventory, server);
            expect(mockServer.to(mockSession.room.code).emit).toHaveBeenCalledWith(GameLogicEvents.UpdateAttribute, player.attributes);
        });

        it('should emit when the player has flag', () => {
            const player: Player = mockSession.room.players[0];
            const session: ActiveSession = mockSession;
            const server: Server = mockServer;

            const newInventory: Item[] = [
                { id: 0, itemType: ItemEnum.Flag, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                { id: 0, itemType: ItemEnum.Chip, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
            ];

            actionsService.updatePlayerAttributes(player.socketId, session, newInventory, server);
            expect(gameLogService.addFlagHolder).toHaveBeenCalled();
        });

        it('should call resetPlayerAttributes for removed items', () => {
            const player: Player = mockSession.room.players[0];
            const session: ActiveSession = mockSession;
            const server: Server = mockServer;

            const newInventory: Item[] = [
                { id: 0, itemType: ItemEnum.Potion, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                { id: 1, itemType: ItemEnum.Pic, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
            ];
            const resetPlayerAttributesSpy = jest.spyOn(actionsService, 'resetPlayerAttributes').mockImplementation(jest.fn());

            actionsService.updatePlayerAttributes(player.socketId, session, newInventory, server);
            expect(resetPlayerAttributesSpy).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ itemType: ItemEnum.Chip })]), // check that removed items are passed to resetPlayerAttributes
                player,
                session,
                server,
            );
        });

        it('should reset player inventory for potion not in inventory', () => {
            const player: Player = mockSession.room.players[1];
            const session: ActiveSession = mockSession;
            const server: Server = mockServer;

            const newInventory: Item[] = [
                { id: 0, itemType: ItemEnum.Potion, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
            ];

            actionsService.resetPlayerAttributes(newInventory, player, session, server);

            expect(player.attributes.lifePoints).toBe(6); // Potion decreases lifePoints by 1
            expect(player.attributes.speedPoints).toBe(1); // Potion increases speedPoints by 2
        });
    });

    it('should reset player inventory for battery not in inventory', () => {
        const player: Player = mockSession.room.players[1];
        const session: ActiveSession = mockSession;
        const server: Server = mockServer;

        const newInventory: Item[] = [
            { id: 0, itemType: ItemEnum.Battery, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
        ];

        actionsService.resetPlayerAttributes(newInventory, player, session, server);

        expect(player.attributes.lifePoints).toBe(5);
        expect(player.attributes.speedPoints).toBe(3);
    });

    describe('hasChipItem', () => {
        it('should return true if player has a chip item', () => {
            const player: Player = {
                socketId: 'player1',
                userName: '',
                inventory: [{ id: 0, itemType: ItemEnum.Chip, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false }],
                attributes: {
                    lifePoints: 5,
                    speedPoints: 3,
                    offensePoints: 1,
                    defensePoints: 2,
                    currentHP: 5,
                    currentSpeed: 3,
                    diceChoice: 'attack',
                    actionLeft: 1,
                },
                position: { x: 0, y: 0 },
                hasActed: false,
                characterType: '',
                isHost: false,
                nbWins: 0,
                hasFlag: true,
            };

            const result = actionsService.hasChipItem(player);
            expect(result).toBe(true);
        });

        it('should return false if player does not have a chip item', () => {
            const player: Player = {
                socketId: 'player1',
                userName: '',
                inventory: [{ id: 0, itemType: ItemEnum.Pic, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false }],
                attributes: {
                    lifePoints: 5,
                    speedPoints: 3,
                    offensePoints: 1,
                    defensePoints: 2,
                    currentHP: 5,
                    currentSpeed: 3,
                    diceChoice: 'attack',
                    actionLeft: 1,
                },
                position: { x: 0, y: 0 },
                hasActed: false,
                characterType: '',
                isHost: false,
                nbWins: 0,
                hasFlag: false,
            };

            const result = actionsService.hasChipItem(player);
            expect(result).toBe(false);
        });
    });
    describe('hasChipItem', () => {
        it('should return true if player has a pic item', () => {
            const player: Player = {
                socketId: 'player1',
                userName: '',
                inventory: [{ id: 0, itemType: ItemEnum.Pic, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false }],
                attributes: {
                    lifePoints: 5,
                    speedPoints: 3,
                    offensePoints: 1,
                    defensePoints: 2,
                    currentHP: 5,
                    currentSpeed: 3,
                    diceChoice: 'attack',
                    actionLeft: 1,
                },
                position: { x: 0, y: 0 },
                hasActed: false,
                characterType: '',
                isHost: false,
                nbWins: 0,
                hasFlag: false,
            };

            const result = actionsService.hasPicItem(player);
            expect(result).toBe(true);
        });

        it('should return false if player does not have a pic item', () => {
            const player: Player = {
                socketId: 'player1',
                userName: '',
                inventory: [{ id: 0, itemType: ItemEnum.Chip, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false }],
                attributes: {
                    lifePoints: 5,
                    speedPoints: 3,
                    offensePoints: 1,
                    defensePoints: 2,
                    currentHP: 5,
                    currentSpeed: 3,
                    diceChoice: 'attack',
                    actionLeft: 1,
                },
                position: { x: 0, y: 0 },
                hasActed: false,
                characterType: '',
                isHost: false,
                nbWins: 0,
                hasFlag: false,
            };

            const result = actionsService.hasPicItem(player);
            expect(result).toBe(false);
        });
    });

    describe('getMapItems', () => {
        it('should push item types to mapItems array if they have effect and are not mystery items', () => {
            const tiles: Tile[][] = [
                [
                    {
                        _tileType: TileEnum.ClosedDoor,
                        player: undefined,
                        traversable: true,
                        terrain: true,
                        imageSrc: '',
                        item: { id: 0, itemType: ItemEnum.Chip, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: true },
                    },
                    {
                        _tileType: TileEnum.ClosedDoor,
                        player: undefined,
                        traversable: true,
                        terrain: true,
                        imageSrc: '',
                        item: { id: 2, itemType: ItemEnum.Mystery, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: true },
                    },
                ],
                [
                    {
                        _tileType: TileEnum.ClosedDoor,
                        player: undefined,
                        traversable: true,
                        terrain: true,
                        imageSrc: '',
                        item: { id: 1, itemType: ItemEnum.Pic, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                    },
                    {
                        _tileType: TileEnum.ClosedDoor,
                        player: undefined,
                        traversable: true,
                        terrain: true,
                        imageSrc: '',
                        item: { id: 0, itemType: ItemEnum.Battery, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: true },
                    },
                ],
            ];

            actionsService.getMapItems(tiles);

            // Check if mapItems contains correct item types
            expect(actionsService.mapItems).toEqual(['chip', 'battery']);
        });
    });

    describe('getAttackBonus', () => {
        it('should return 2 if attacker has a-bomb and HP is 1', () => {
            const player: Player = {
                socketId: 'player1',
                userName: '',
                inventory: [{ id: 0, itemType: ItemEnum.ABomb, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false }],
                attributes: {
                    lifePoints: 1,
                    speedPoints: 3,
                    offensePoints: 1,
                    defensePoints: 2,
                    currentHP: 1,
                    currentSpeed: 3,
                    diceChoice: 'attack',
                    actionLeft: 1,
                },
                position: { x: 0, y: 0 },
                hasActed: false,
                characterType: '',
                isHost: false,
                nbWins: 0,
                hasFlag: true,
            };

            const result = actionsService.getAttackBonus(player);
            expect(result).toBe(2);
        });

        it('should return 1 if attacker does not have a-bomb or HP is not 1', () => {
            const player: Player = {
                socketId: 'player1',
                userName: '',
                hasFlag: true,
                inventory: [{ id: 0, itemType: ItemEnum.Chip, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false }],
                attributes: {
                    lifePoints: 5,
                    speedPoints: 3,
                    offensePoints: 1,
                    defensePoints: 2,
                    currentHP: 5,
                    currentSpeed: 3,
                    diceChoice: 'attack',
                    actionLeft: 1,
                },
                position: { x: 0, y: 0 },
                hasActed: false,
                characterType: '',
                isHost: false,
                nbWins: 0,
            };

            const result = actionsService.getAttackBonus(player);
            expect(result).toBe(1);
        });
    });

    describe('getDefenseBonus', () => {
        it('should return 2 if defender has nano-bot and attacker has 2 wins', () => {
            const attacker: Player = {
                socketId: 'attacker',
                userName: '',
                inventory: [{ id: 0, itemType: ItemEnum.NanoBot, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false }],
                attributes: {
                    lifePoints: 5,
                    speedPoints: 3,
                    offensePoints: 1,
                    defensePoints: 2,
                    currentHP: 5,
                    currentSpeed: 3,
                    diceChoice: 'attack',
                    actionLeft: 1,
                },
                hasFlag: false,
                position: { x: 0, y: 0 },
                hasActed: false,
                characterType: '',
                isHost: false,
                nbWins: 2, // Attacker has 2 wins
            };

            const defender: Player = {
                socketId: 'defender',
                userName: '',
                hasFlag: true,
                inventory: [{ id: 0, itemType: ItemEnum.NanoBot, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false }],
                attributes: {
                    lifePoints: 5,
                    speedPoints: 3,
                    offensePoints: 1,
                    defensePoints: 2,
                    currentHP: 5,
                    currentSpeed: 3,
                    diceChoice: 'attack',
                    actionLeft: 1,
                },
                position: { x: 0, y: 0 },
                hasActed: false,
                characterType: '',
                isHost: false,
                nbWins: 0,
            };

            const result = actionsService.getDefenseBonus(attacker, defender);
            expect(result).toBe(2);
        });
    });

    describe('checkForMystery', () => {
        const tiles: Tile[][] = [
            [
                {
                    _tileType: TileEnum.ClosedDoor,
                    player: undefined,
                    item: {
                        itemType: ItemEnum.Mystery,
                        id: 1,
                        imgSrc: '',
                        isRandom: false,
                        isOnGrid: false,
                        description: '',
                        hasEffect: false,
                    },
                    traversable: false,
                    imageSrc: '',
                    terrain: false,
                },
                {
                    _tileType: TileEnum.ClosedDoor,
                    player: undefined,
                    item: {
                        itemType: ItemEnum.Mystery,
                        id: 2,
                        imgSrc: '',
                        isRandom: false,
                        isOnGrid: false,
                        description: '',
                        hasEffect: false,
                    },
                    traversable: false,
                    imageSrc: '',
                    terrain: false,
                },
            ],
            [
                {
                    _tileType: TileEnum.ClosedDoor,
                    player: undefined,
                    item: {
                        itemType: ItemEnum.Mystery,
                        id: 3,
                        imgSrc: '',
                        isRandom: false,
                        isOnGrid: false,
                        description: '',
                        hasEffect: false,
                    },
                    traversable: false,
                    imageSrc: '',
                    terrain: false,
                },
                {
                    _tileType: TileEnum.ClosedDoor,
                    player: undefined,
                    item: {
                        itemType: ItemEnum.Mystery,
                        id: 4,
                        imgSrc: '',
                        isRandom: false,
                        isOnGrid: false,
                        description: '',
                        hasEffect: false,
                    },
                    traversable: false,
                    imageSrc: '',
                    terrain: false,
                },
            ],
        ];

        it('should replace mystery tiles with random unique items and update mapItems', () => {
            actionsService.uniqueItems = [ItemEnum.ABomb, ItemEnum.Battery, ItemEnum.Chip, ItemEnum.NanoBot, ItemEnum.Pic, ItemEnum.Potion];
            actionsService.mapItems = [];
            actionsService.getMapItems = jest.fn();

            actionsService.checkForMystery(tiles);

            expect(actionsService.getMapItems).toHaveBeenCalledWith(tiles);
            expect(actionsService.mapItems.length).toBeGreaterThanOrEqual(0);

            tiles.forEach((row) => {
                row.forEach((tile) => {
                    if (tile.item?.itemType === 'mystery') {
                        fail('Mystery item was not replaced');
                    }
                });
            });
            tiles.forEach((row) => {
                row.forEach((tile) => {
                    if (tile.item?.itemType === 'mystery') {
                        expect(tile.item).not.toBeUndefined();
                        expect(actionsService.mapItems).toContain(tile.item?.itemType);
                    }
                });
            });
        });
    });

    describe('canStillActCheck', () => {
        it('should call endTurn when player has no nearby action', () => {
            jest.spyOn(actionsService, 'playerHasNearbyAction').mockReturnValue(false);

            const player: Player = mockSession.room.players[0]; // Use a mock player from the session
            actionsService.canStillActCheck(player, mockSession.room.map, mockSession, mockServer);
            expect(turnService.endTurn).toHaveBeenCalledWith(mockSession, mockServer);
        });

        it('should not call endTurn when player has nearby action', () => {
            jest.spyOn(actionsService, 'playerHasNearbyAction').mockReturnValue(true);

            const player: Player = mockSession.room.players[0]; // Use a mock player from the session
            actionsService.canStillActCheck(player, mockSession.room.map, mockSession, mockServer);
            expect(turnService.endTurn).not.toHaveBeenCalled();
        });
    });

    describe('playerCanDoAction', () => {
        it('should return true if player can do an action', () => {
            jest.spyOn(actionsService, 'playerHasNearbyAction').mockReturnValue(true);
            turnService.hasTurn.mockReturnValue(true); // Player has turn

            const player: Player = mockSession.room.players[0]; // Use a mock player from the session
            const result = actionsService.playerCanDoAction(player, mockSession);
            expect(result).toBe(true);
        });

        it('should return false if player has already acted', () => {
            jest.spyOn(actionsService, 'playerHasNearbyAction').mockReturnValue(true);
            turnService.hasTurn.mockReturnValue(true); // Player has turn

            const player: Player = { ...mockSession.room.players[0], hasActed: true }; // Player has already acted
            const result = actionsService.playerCanDoAction(player, mockSession);
            expect(result).toBe(false);
        });

        it('should return false if no action nearby', () => {
            jest.spyOn(actionsService, 'playerHasNearbyAction').mockReturnValue(false);

            const player: Player = mockSession.room.players[0]; // Use a mock player from the session
            const result = actionsService.playerCanDoAction(player, mockSession);
            expect(result).toBe(false);
        });

        it("should return false if it's not the player's turn", () => {
            jest.spyOn(actionsService, 'playerHasNearbyAction').mockReturnValue(true);
            turnService.hasTurn.mockReturnValue(false); // Not the player's turn
            const player: Player = mockSession.room.players[0]; // Use a mock player from the session

            const result = actionsService.playerCanDoAction(player, mockSession);
            expect(result).toBe(false);
        });
    });

    describe('handleVirtualPlayerInventory', () => {
        it('should add new item to inventory if there is space', () => {
            const currentPlayer = mockSession.room.players[0];
            const newItem: Item = {
                id: 2,
                itemType: ItemEnum.Battery,
                imgSrc: '',
                isRandom: false,
                isOnGrid: false,
                description: '',
                hasEffect: false,
            };
            const discardedItem = actionsService.handleVirtualPlayerInventory(currentPlayer, newItem, mockSession, mockServer);
            expect(currentPlayer.inventory.length).toBe(2);
            expect(currentPlayer.inventory[1].itemType === ItemEnum.Pic || currentPlayer.inventory[1].itemType === ItemEnum.Chip).toBeTruthy();
        });

        it('should discard an item when inventory is full and call updatePlayerAttributes', () => {
            const currentPlayer = mockSession.room.players[0];
            const newItem: Item = { id: 2, itemType: ItemEnum.Chip, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false };
            jest.spyOn(actionsService, 'prioritizeItems').mockReturnValue([
                { id: 0, itemType: ItemEnum.Potion, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                { id: 1, itemType: ItemEnum.Pic, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
            ]);
            const discardedItem = actionsService.handleVirtualPlayerInventory(currentPlayer, newItem, mockSession, mockServer);
            expect(currentPlayer.inventory.length).toBe(2);
            expect(discardedItem?.itemType).toBe(ItemEnum.Chip);
        });
    });

    describe('prioritizeItems', () => {
        it('should prioritize aggressive items for aggressive players', () => {
            const currentPlayer = mockSession.room.players[0];
            const newItem: Item = {
                id: 2,
                itemType: ItemEnum.Battery,
                imgSrc: '',
                isRandom: false,
                isOnGrid: false,
                description: '',
                hasEffect: false,
            };

            const result = actionsService.prioritizeItems(currentPlayer, newItem);
            expect(result.length).toBe(2);
            expect(result[0].itemType).toBe(ItemEnum.Battery);
            expect(result[1].itemType === ItemEnum.Chip || result[1].itemType === ItemEnum.Pic).toBeTruthy();
        });

        it('should prioritize defensive items for non-aggressive players', () => {
            const currentPlayer = { ...mockSession.room.players[0], isAgressive: false };
            const newItem: Item = {
                id: 2,
                itemType: ItemEnum.Battery,
                imgSrc: '',
                isRandom: false,
                isOnGrid: false,
                description: '',
                hasEffect: false,
            };
            actionsService.defensiveItems = [ItemEnum.Pic, ItemEnum.Potion];
            const result = actionsService.prioritizeItems(currentPlayer, newItem);

            expect(result.length).toBe(2);
            expect(result[0].itemType).toBe(ItemEnum.Pic);
            expect(result[1].itemType === ItemEnum.Battery || result[1].itemType === ItemEnum.Chip).toBeTruthy();
        });
    });

    it('should toggle a closed door to open if adjacent and player has not acted', () => {
        const socketId = 'player1';
        const pos: Position = { x: 1, y: 1 }; // Position of the door
        const session: ActiveSession = mockSession;
        const server: Server = mockServer;
        const player = mockSession.room.players[0];
        player.hasActed = false;
        session.room.map._tiles[pos.y][pos.x]._tileType = TileEnum.ClosedDoor;

        tileValidityService.isAdjascent.mockReturnValue(true);

        actionsService.toggleDoor(socketId, session, pos, server);

        expect(session.room.map._tiles[pos.y][pos.x]._tileType).toBe(TileEnum.OpenDoor);

        expect(player.hasActed).toBe(true);

        expect(gameLogService.doorLog).toHaveBeenCalledWith(true, player, session.room.code, server);
        expect(gameLogService.addToggledDoor).toHaveBeenCalledWith(session.room.code, '1,1');
        expect(gameLogService.calculateDoorsToggled).toHaveBeenCalled();

        expect(server.to).toHaveBeenCalledWith(session.room.code);
        expect(server.emit).toHaveBeenCalledWith(GameLogicEvents.UpdateMap, session.room.map);
    });

    it('should toggle an open door to closed if adjacent and player has not acted', () => {
        const socketId = 'player1';
        const pos: Position = { x: 1, y: 1 }; // Position of the door
        const session: ActiveSession = mockSession;
        const server: Server = mockServer;
        const player = mockSession.room.players[0];
        player.hasActed = false;

        session.room.map._tiles[pos.y][pos.x]._tileType = TileEnum.OpenDoor;

        tileValidityService.isAdjascent.mockReturnValue(true);

        actionsService.toggleDoor(socketId, session, pos, server);

        expect(session.room.map._tiles[pos.y][pos.x]._tileType).toBe(TileEnum.ClosedDoor);

        expect(player.hasActed).toBe(true);

        expect(gameLogService.doorLog).toHaveBeenCalledWith(false, player, session.room.code, server);
        expect(gameLogService.addToggledDoor).toHaveBeenCalled();
        expect(gameLogService.calculateDoorsToggled).toHaveBeenCalled();

        expect(server.to).toHaveBeenCalledWith(session.room.code);
        expect(server.emit).toHaveBeenCalledWith(GameLogicEvents.UpdateMap, session.room.map);
    });

    it('should not toggle the door if the player has already acted', () => {
        const socketId = 'player1';
        const pos: Position = { x: 1, y: 1 };
        const session: ActiveSession = mockSession;
        const server: Server = mockServer;

        const player = mockSession.room.players[0];
        player.hasActed = true;

        session.room.map._tiles[pos.y][pos.x]._tileType = TileEnum.ClosedDoor;

        actionsService.toggleDoor(socketId, session, pos, server);

        // Assert: The door should not be toggled
        expect(session.room.map._tiles[pos.y][pos.x]._tileType).toBe(TileEnum.ClosedDoor);

        // Assert: infoService methods should not be called
        expect(gameLogService.doorLog).not.toHaveBeenCalled();
        expect(gameLogService.addToggledDoor).not.toHaveBeenCalled();
        expect(gameLogService.calculateDoorsToggled).not.toHaveBeenCalled();
    });

    it('should not toggle the door if the player is not adjacent', () => {
        const socketId = 'player1';
        const pos: Position = { x: 1, y: 1 }; // Position of the door (not adjacent)
        const session: ActiveSession = mockSession;
        const server: Server = mockServer;

        // Ensure the player is not adjacent
        const player = mockSession.room.players[0];
        player.hasActed = false;

        // Mock the tile type to be ClosedDoor
        session.room.map._tiles[pos.y][pos.x]._tileType = TileEnum.ClosedDoor;

        // Mock tile validity check (not adjacent)
        tileValidityService.isAdjascent.mockReturnValue(false);

        // Act: Call the method
        actionsService.toggleDoor(socketId, session, pos, server);

        // Assert: The door should not be toggled
        expect(session.room.map._tiles[pos.y][pos.x]._tileType).toBe(TileEnum.ClosedDoor);

        // Assert: infoService methods should not be called
        expect(gameLogService.doorLog).not.toHaveBeenCalled();
        expect(gameLogService.addToggledDoor).not.toHaveBeenCalled();
        expect(gameLogService.calculateDoorsToggled).not.toHaveBeenCalled();
    });

    describe('handleCombatEnd', () => {
        it('should correctly update the map with player inventory items', () => {
            const player: Player = mockSession.room.players[0];
            const session: ActiveSession = mockSession;
            const server: Server = mockServer;

            // Mock the return value of calculateNearestPosition to return some positions
            const nearestPositions = [
                { x: 0, y: 1 },
                { x: 1, y: 1 },
            ];
            tileValidityService.calculateNearestPosition.mockReturnValue(nearestPositions);

            // Mock player inventory
            const newInventory: Item[] = [
                { id: 0, itemType: ItemEnum.Potion, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
                { id: 1, itemType: ItemEnum.Pic, imgSrc: '', isRandom: false, isOnGrid: false, description: '', hasEffect: false },
            ];
            player.inventory = newInventory;

            actionsService.handleCombatEnd(player, session, server);

            // Ensure that the items are placed in the correct positions on the map
            expect(session.room.map._tiles[nearestPositions[0].y][nearestPositions[0].x].item).toEqual(newInventory[0]);
            expect(session.room.map._tiles[nearestPositions[1].y][nearestPositions[1].x].item).toEqual(newInventory[1]);

            // Ensure that the player's inventory is cleared after combat
            expect(player.inventory).toEqual([]);

            // Check if resetPlayerAttributes was called with correct parameters
            //expect(actionsService.resetPlayerAttributes).toHaveBeenCalled();

            // Verify that events are emitted correctly
            expect(mockServer.to(session.room.code).emit).toHaveBeenCalledWith(GameLogicEvents.NewInventory, player.inventory);
            expect(mockServer.to(session.room.code).emit).toHaveBeenCalledWith(GameLogicEvents.UpdateMap, session.room.map);
        });
    });
});
