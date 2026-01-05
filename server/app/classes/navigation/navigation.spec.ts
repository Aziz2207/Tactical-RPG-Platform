import { DEFAULT_ATTRIBUTE, NO_ITEM } from '@app/constants';
import { mockGameNavigation, mockNeighborGame } from '@app/mocks/map-mocks';
import { playerNavigation } from '@app/mocks/mock-player';
import { mockNavigationPlayers } from '@app/mocks/mock-players';
import { ObjectType } from '@common/avatars-info';
import { TileCost, TileType } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { Player, Position } from '@common/interfaces/player';
import { PointWithDistance } from '@common/interfaces/point-distance.interface';
import { Room } from '@common/interfaces/room';
import { ActionData } from '@common/interfaces/socket-data.interface';
import { gameObjects } from '@common/objects-info';
import { Navigation } from './navigation';

/* eslint max-lines: ["off"] */
/* eslint-disable @typescript-eslint/no-explicit-any */
describe('Navigation', () => {
    let navigation: Navigation;
    let mockPlayer: Player;
    let mockRoom: Room;
    let mockGame: Game;
    let combatActionData: ActionData;
    let mockPlayers: Player[];

    beforeEach(() => {
        mockPlayers = [{ id: '1', position: { x: 1, y: 1 } } as Player, { id: '2', position: { x: 2, y: 1 } } as Player];

        navigation = new Navigation(mockGameNavigation, mockGameNavigation.itemPlacement, mockNavigationPlayers);
        mockPlayer = {
            position: { x: 0, y: 0 },
            attributes: {
                movementPointsLeft: 10,
            },
        } as Player;
        mockGame = {
            tiles: [
                [1, 1, 1],
                [2, 0, 1],
                [1, 1, 1],
            ],
            dimension: 3,
        } as unknown as Game;

        mockRoom = {
            gameMap: mockGame,
        } as Room;

        combatActionData = {
            player: mockPlayers[0],
            clickedPosition: { x: 2, y: 2 },
        } as ActionData;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should toggle door state', () => {
        let result = navigation['toggleDoorState'](TileType.ClosedDoor);
        expect(result).toEqual(TileType.OpenDoor);

        result = navigation['toggleDoorState'](TileType.OpenDoor);
        expect(result).toEqual(TileType.ClosedDoor);

        result = navigation['toggleDoorState'](TileType.Ground);
        expect(result).toEqual(TileType.Ground);
    });

    it('should return true if the tile is ClosedDoor or OpenDoor', () => {
        let position: Position = { x: 1, y: 1 };
        navigation.gameMap.tiles = [
            [TileType.Ground, TileType.OpenDoor],
            [TileType.Ground, TileType.ClosedDoor],
        ];
        const resultClose = navigation['isTileDoor'](position);
        expect(resultClose).toBe(true);

        position = { x: 0, y: 1 };
        const resultOpen = navigation['isTileDoor'](position);
        expect(resultOpen).toBe(true);
    });

    it('should initialize all the attributes', () => {
        navigation['initializeDistances'](playerNavigation, mockGame);
        expect(navigation['distances'].length).toEqual(mockGame.dimension);
        expect(navigation['previous'].length).toEqual(mockGame.dimension);
        expect(navigation['distances'][playerNavigation.position.x][playerNavigation.position.y]).toEqual(0);
    });

    it('should return false if the player is not adjacent to anyone else', () => {
        navigation.players = [playerNavigation];
        navigation.getNeighborPlayers = jest.fn().mockReturnValue([]);
        expect(navigation.checkAttack(playerNavigation, mockNavigationPlayers)).toBe(false);
    });

    it('should return true if a player is adjacent to the active one', () => {
        navigation.players = [playerNavigation];
        navigation.getNeighborPlayers = jest.fn().mockReturnValue([{ x: 0, y: 0 }]);
        navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(true);
        expect(navigation.checkAttack(playerNavigation, mockNavigationPlayers)).toBe(true);
    });

    it('should return true if checkAttack or checkDoor return true', () => {
        navigation.hasActionPoints = jest.fn().mockReturnValue(true);
        navigation.checkAttack = jest.fn().mockReturnValue(true);
        navigation.checkDoor = jest.fn().mockReturnValue(undefined);
        expect(navigation.haveActions(playerNavigation, mockNavigationPlayers)).toBe(true);

        navigation.checkAttack = jest.fn().mockReturnValue(undefined);
        navigation.checkDoor = jest.fn().mockReturnValue(true);
        expect(navigation.haveActions(playerNavigation, mockNavigationPlayers)).toBe(true);
    });

    it('haveActions should return false if checkAttack and checkDoor return undefined', () => {
        navigation.hasActionPoints = jest.fn().mockReturnValue(true);
        navigation.checkAttack = jest.fn().mockReturnValue(undefined);
        navigation.checkDoor = jest.fn().mockReturnValue(undefined);
        expect(navigation.haveActions(playerNavigation, mockNavigationPlayers)).toBe(undefined);
    });

    describe('getTileCost', () => {
        it('should return the correct tile cost', () => {
            expect(navigation['getTileCost'](TileType.Ground)).toEqual(TileCost.Ground);
            expect(navigation['getTileCost'](TileType.Water)).toEqual(TileCost.Water);
            expect(navigation['getTileCost'](TileType.Ice)).toEqual(TileCost.Ice);
            expect(navigation['getTileCost'](TileType.OpenDoor)).toEqual(TileCost.OpenDoor);
            expect(navigation['getTileCost'](TileType.Wall)).toEqual(Infinity);
        });

        it('should return infinity if wall and player not active', () => {
            navigation.players = [];
            expect(navigation['getTileCost'](TileType.Wall)).toEqual(Infinity);
        });

        it('should return ground if wall and player has kunee', () => {
            const playerKunee = { inventory: [gameObjects[ObjectType.Kunee - 1]], isActive: true } as Player;
            navigation.players = [playerKunee];
            expect(navigation['getTileCost'](TileType.Wall)).toEqual(TileCost.Ground);
        });
    });

    it('should call getTileCost', () => {
        navigation['isReachableTile'] = jest.fn().mockReturnValue(false);
        navigation.isBot = false;
        navigation['previous'] = [
            [
                { x: 1, y: 0 },
                { x: 1, y: 0 },
            ],
            [
                { x: 1, y: 0 },
                { x: 1, y: 0 },
            ],
        ];
        navigation['distances'] = [
            [1, 1, 1],
            [1, 1, 1],
            [1, 1, 1],
        ];
        navigation['getTileCost'] = jest.fn().mockReturnValue(TileCost.Ice);
        navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(false);

        navigation['exploreNeighborsForReachableTiles'](
            [{ x: 1, y: 2 }],
            { x: 0, y: 0, distance: 0 },
            [{ x: 0, y: 0, distance: 0 }],
            DEFAULT_ATTRIBUTE,
            mockGameNavigation,
        );
        expect(navigation['getTileCost']).toHaveBeenCalled();
    });

    describe('exploreNeighborsForReachableTiles', () => {
        let priorityQueue: PointWithDistance[];
        let maxMovementPoints: number;

        beforeEach(() => {
            priorityQueue = [];

            navigation['distances'] = [
                [Infinity, Infinity, Infinity],
                [Infinity, Infinity, Infinity],
                [Infinity, Infinity, Infinity],
            ];

            navigation['previous'] = [
                [
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                ],
                [
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                ],
                [
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                ],
            ];

            navigation.positions = [
                [NO_ITEM, NO_ITEM, NO_ITEM],
                [NO_ITEM, NO_ITEM, NO_ITEM],
                [NO_ITEM, NO_ITEM, NO_ITEM],
            ];
        });

        it('should skip walls', () => {
            const neighbors = [
                { x: 0, y: 2 },
                { x: 2, y: 0 },
            ];
            const current: PointWithDistance = { x: 1, y: 1, distance: 0 };
            navigation.isBot = true;
            navigation['exploreNeighborsForReachableTiles'](neighbors, current, priorityQueue, DEFAULT_ATTRIBUTE, mockNeighborGame);

            expect(navigation['distances'][0][2]).toBe(Infinity);
            expect(navigation['distances'][2][0]).toBe(Infinity);
        });

        it('should skip tiles occupied by player', () => {
            navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(true);
            navigation.isBot = false;
            navigation.positions[2][0] = ObjectType.Hestia;

            const neighbors = [{ x: 2, y: 0 }];
            const current: PointWithDistance = { x: 1, y: 1, distance: 0 };

            navigation['exploreNeighborsForReachableTiles'](neighbors, current, priorityQueue, DEFAULT_ATTRIBUTE, mockNeighborGame);
            expect(navigation['distances'][2][0]).toBe(Infinity);
        });

        it('should process reachable tiles', () => {
            const neighbors = [{ x: 1, y: 0 }];
            const current: PointWithDistance = { x: 1, y: 1, distance: 0 };

            navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(false);
            navigation['exploreNeighborsForReachableTiles'](neighbors, current, priorityQueue, DEFAULT_ATTRIBUTE, mockNeighborGame);
            const expectedDistance = 1;

            expect(navigation['distances'][1][0]).toBe(expectedDistance);
            expect(priorityQueue).toEqual([{ x: 1, y: 0, distance: expectedDistance }]);
        });

        it('should not process tiles if new distance exceeds maxMovementPoints', () => {
            maxMovementPoints = 0;
            const neighbors = [{ x: 1, y: 0 }];
            const current: PointWithDistance = { x: 1, y: 1, distance: 0 };

            navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(false);
            navigation['exploreNeighborsForReachableTiles'](neighbors, current, priorityQueue, maxMovementPoints, mockNeighborGame);
            expect(navigation['distances'][1][0]).toBe(Infinity);
            expect(priorityQueue).not.toContain({ x: 1, y: 0, distance: Infinity });
        });

        it('should update distances and previous correctly for reachable tiles', () => {
            const neighbors = [{ x: 1, y: 0 }];
            const current: PointWithDistance = { x: 1, y: 1, distance: 0 };

            navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(false);
            navigation['exploreNeighborsForReachableTiles'](neighbors, current, priorityQueue, DEFAULT_ATTRIBUTE, mockNeighborGame);

            expect(navigation['distances'][1][0]).toBe(1);
            expect(navigation['distances'][1][0]).toEqual(1);
        });
    });

    it('should return the next node if it is not empty', () => {
        const result = navigation['getNextNode']([
            { x: 0, y: 0, distance: 0 },
            { x: 1, y: 1, distance: 1 },
        ]);
        expect(result).toEqual({ x: 0, y: 0, distance: 0 });
    });

    it('should return undefined if the queue is empty', () => {
        const result = navigation['getNextNode']([]);
        expect(result).toBeUndefined();
    });

    it('isDestinationReached should return true if the player is a destination', () => {
        const result = navigation['isDestinationReached']({ x: 1, y: 1, distance: 1 }, { x: 1, y: 1 });
        expect(result).toBe(true);
    });

    it('isDestinationReached should return false if the player hasnt arrived yet', () => {
        const result = navigation['isDestinationReached']({ x: 1, y: 1, distance: 1 }, { x: 0, y: 0 });
        expect(result).toBe(false);
    });

    describe('exploreNeighbors', () => {
        beforeEach(() => {
            navigation['isReachableTile'] = jest.fn().mockReturnValue(true);
            navigation.isBot = true;
            navigation['distances'] = [
                [Infinity, Infinity, Infinity],
                [Infinity, Infinity, Infinity],
                [Infinity, Infinity, Infinity],
            ];
            navigation['previous'] = [
                [
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                ],
                [
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                ],
                [
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                ],
            ];
        });
        it('should skip walls', () => {
            const neighbors: Position[] = [
                { x: 0, y: 2 },
                { x: 2, y: 0 },
            ];

            const current = { x: 1, y: 1, distance: 0 };
            const priorityQueue = [{ x: 1, y: 1, distance: 0 }];

            navigation['exploreNeighbors'](neighbors, current, priorityQueue, mockNeighborGame);

            expect(navigation['distances'][0][2]).toBe(Infinity);
            expect(navigation['distances'][2][0]).toBe(Infinity);
        });

        it('should skip objects that block movement', () => {
            navigation.positions[2][0] = ObjectType.Hestia;

            const neighbors: Position[] = [
                { x: 2, y: 0 },
                { x: 1, y: 0 },
            ];

            const current = { x: 1, y: 1, distance: 0 };
            const priorityQueue = [{ x: 1, y: 1, distance: 0 }];

            navigation['getTileCost'] = jest.fn().mockReturnValue(TileCost.Ground);
            navigation['exploreNeighbors'](neighbors, current, priorityQueue, mockNeighborGame);

            expect(navigation['distances'][2][0]).toBe(1);
            expect(navigation['distances'][1][0]).toBe(TileCost.Ground);
        });

        it('should correctly update distances and previous matrices for valid tiles', () => {
            const neighbors: Position[] = [
                { x: 1, y: 0 },
                { x: 1, y: 2 },
            ];
            navigation.isBot = true;
            const current = { x: 1, y: 1, distance: 0 };
            const priorityQueue = [{ x: 1, y: 1, distance: 0 }];

            navigation['getTileCost'] = jest.fn().mockReturnValue(TileCost.Ground);
            navigation['exploreNeighbors'](neighbors, current, priorityQueue, mockNeighborGame);

            expect(navigation['distances'][1][0]).toBe(TileCost.Ground);
            expect(navigation['distances'][1][2]).toBe(TileCost.Ground);

            expect(navigation['previous'][1][0]).toEqual({ x: 1, y: 1 });
            expect(navigation['previous'][1][2]).toEqual({ x: 1, y: 1 });
        });
    });

    it('should return the correct path', () => {
        navigation['previous'] = [
            [null, null],
            [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
            ],
        ];
        const result = navigation['reconstructPath']({ x: 1, y: 0 });

        expect(result).toEqual([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
        ]);
    });

    it('should return true if the tiles is valid for debug Mode', () => {
        const position: Position = { x: 0, y: 0 };
        navigation.gameMap.tiles = [
            [TileType.Ground, TileType.OpenDoor],
            [TileType.Wall, TileType.ClosedDoor],
        ];
        navigation.gameMap.itemPlacement = [
            [NO_ITEM, NO_ITEM],
            [NO_ITEM, NO_ITEM],
        ];

        navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(false);
        const isValid = navigation['isTileValidTeleport'](position.x, position.y);
        expect(isValid).toBe(true);
    });

    it('should return false when the tiles are terrain tile, but there is an objet on it', () => {
        const position: Position = { x: 0, y: 0 };

        navigation.gameMap.tiles = [
            [TileType.Ground, TileType.OpenDoor],
            [TileType.Wall, TileType.ClosedDoor],
        ];
        navigation.gameMap.itemPlacement = [
            [TileType.ClosedDoor, NO_ITEM],
            [NO_ITEM, NO_ITEM],
        ];

        navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(false);
        const isValid = navigation['isTileValidTeleport'](position.x, position.y);
        expect(isValid).toBe(false);
    });

    it('should return true when the tiles are valid for debug Mode', () => {
        const position: Position = { x: 0, y: 0 };
        navigation.gameMap.tiles = [
            [TileType.Ground, TileType.OpenDoor],
            [TileType.Wall, TileType.ClosedDoor],
        ];
        navigation.gameMap.itemPlacement = [
            [NO_ITEM, NO_ITEM],
            [NO_ITEM, NO_ITEM],
        ];

        navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(false);
        const isValid = navigation['isTileValidTeleport'](position.x, position.y);
        expect(isValid).toBe(true);
    });

    it('should find the fastest path to a reachable destination', () => {
        const destination = { x: 2, y: 2 };
        const result = navigation.findFastestPath(mockPlayer, destination, mockRoom);

        expect(result).toEqual([
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 2, y: 1 },
            { x: 2, y: 2 },
        ]);
    });

    it('should find all reachable tiles', () => {
        const result = navigation.findReachableTiles(playerNavigation, mockRoom);
        const reachability: Position[] = [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 2, y: 0 },
            { x: 0, y: 2 },
            { x: 2, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
        ];
        expect(result).toEqual(reachability);
    });

    it('should find all reachable tiles and contnue', () => {
        const player = JSON.parse(JSON.stringify(playerNavigation));
        const result = navigation.findReachableTiles(player, mockRoom);
        const reachability: Position[] = [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 2, y: 0 },
            { x: 0, y: 2 },
            { x: 2, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
        ];
        expect(result).toEqual(reachability);
    });

    it('should initialize distances with Infinity and set the player’s position to 0', () => {
        const distance = 3;
        navigation['initializeDistances'](mockPlayer, mockGame);
        expect(navigation['distances'].length).toBe(distance);
        expect(navigation['distances'][0].length).toBe(distance);
        navigation['distances'].forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                if (rowIndex === 1 && colIndex === 1) {
                    navigation['distances'][0][1] = 0;
                }
            });
        });
    });
    it('should return the closest player within reachable tiles', () => {
        jest.spyOn(navigation, 'findReachableTiles').mockReturnValue([
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ]);
        const result = navigation.findClosestPlayer(mockPlayer, mockPlayers, mockRoom);
        expect(navigation.findReachableTiles).toHaveBeenCalledWith(mockPlayer, mockRoom);
        expect(result).toEqual(mockPlayers[0]);
    });

    it('should handle an empty players array', () => {
        jest.spyOn(navigation, 'findReachableTiles').mockReturnValue([
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ]);
        const result = navigation.findClosestPlayer(mockPlayer, [], mockRoom);
        expect(navigation.findReachableTiles).toHaveBeenCalledWith(mockPlayer, mockRoom);
        expect(result).toBeUndefined();
    });

    describe('hasHandleDoorAction', () => {
        it('should return true if door neighbor', () => {
            const row = 1;
            const col = 0;
            navigation['isNeighbor'] = jest.fn().mockReturnValue(true);
            navigation['isTileDoor'] = jest.fn().mockReturnValue(true);
            navigation['toggleDoorState'] = jest.fn();

            const result = navigation['hasHandleDoorAction'](row, col, playerNavigation);
            expect(result).toBe(true);
        });

        it('should return false if door not neighbor', () => {
            const row = 1;
            const col = 0;
            navigation['isNeighbor'] = jest.fn().mockReturnValue(false);
            navigation['isTileDoor'] = jest.fn().mockReturnValue(true);
            navigation['toggleDoorState'] = jest.fn();

            const result = navigation['hasHandleDoorAction'](row, col, playerNavigation);
            expect(result).toBe(false);
        });
    });

    describe('getCombatOpponent', () => {
        it('should return opponent if is player', () => {
            navigation['getNeighborPlayers'] = jest.fn().mockReturnValue([playerNavigation]);
            navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(true);
            navigation['getPlayerWithPosition'] = jest.fn().mockReturnValue(playerNavigation);

            const result = navigation['getCombatOpponent'](combatActionData);
            expect(result).toBe(playerNavigation);
        });

        it('should return null if no target found', () => {
            navigation['getNeighborPlayers'] = jest.fn().mockReturnValue([playerNavigation]);
            navigation['hasPlayerOnTile'] = jest.fn().mockReturnValue(false);

            const result = navigation['getCombatOpponent'](combatActionData);
            expect(result).toBeNull();
        });
    });

    it('should return neighboring players for the given player', () => {
        const neighbors = [{ x: 0, y: 1 }];
        const neighborPlayer = { position: { x: 0, y: 1 } } as Player;
        navigation['hasPlayerOnTile'] = jest.fn().mockReturnValueOnce(true);
        navigation['getNeighbors'] = jest.fn().mockReturnValue(neighbors);

        const result = navigation.getNeighborPlayers(neighborPlayer, [neighborPlayer]);
        expect(result).toEqual([neighborPlayer]);
    });

    it('should return neighboring door position for the given player', () => {
        const neighbor = { x: 0, y: 1 };
        navigation['isTileDoor'] = jest.fn().mockReturnValueOnce(true);
        navigation['hasPlayerOnTile'] = jest.fn().mockReturnValueOnce(false);
        navigation['getNeighbors'] = jest.fn().mockReturnValue([neighbor]);

        const result = navigation.getNeighborDoors(playerNavigation, [playerNavigation]);
        expect(result).toEqual([neighbor]);
    });

    it('should return true if there is door around', () => {
        const neighbors = [{ x: 0, y: 1 }];
        navigation['getNeighborDoors'] = jest.fn().mockReturnValueOnce(neighbors);
        const result = navigation.checkDoor(playerNavigation, [playerNavigation]);
        expect(result).toBe(true);
    });

    describe('hasActionPoints', () => {
        it('should return true if there is action points', () => {
            const player = { attributes: { actionPoints: 1 } } as Player;
            const result = navigation.hasActionPoints(player);
            expect(result).toBe(true);
        });

        it('should return false if there no player', () => {
            const player = undefined as Player;
            const result = navigation.hasActionPoints(player);
            expect(result).toBe(false);
        });
    });

    describe('hasMovementPoints', () => {
        it('should return true if there is movement points', () => {
            const player = { attributes: { movementPointsLeft: 1 } } as Player;
            const result = navigation.hasMovementPoints(player);
            expect(result).toBe(true);
        });

        it('should return false if there noplayer', () => {
            const player = undefined as Player;
            const result = navigation.hasMovementPoints(player);
            expect(result).toBe(false);
        });
    });

    it('should call findClosestValidTile to move player from wall', () => {
        const postion = { x: 0, y: 0 };
        navigation['findClosestValidTile'] = jest.fn().mockReturnValue(postion);

        const result = navigation.movePlayerFromWall(mockRoom, playerNavigation);
        expect(result).toBe(postion);
    });

    it('should return trus if neighbor', () => {
        const row = 0;
        const col = 1;
        const neighbor = { x: 0, y: 1 };
        navigation['getNeighbors'] = jest.fn().mockReturnValue([neighbor]);

        const result = navigation['isNeighbor'](row, col, playerNavigation);
        expect(result).toBe(true);
    });

    it('should return true if valid tile', () => {
        navigation.gameMap.itemPlacement = [[NO_ITEM]];
        navigation['isTileAccessible'] = jest.fn().mockReturnValue(true);
        const result = navigation['isTileValidForPlayer'](0, 0);
        expect(result).toBe(true);
    });

    describe('findClosestValidTile', () => {
        let neighbors;
        beforeEach(() => {
            neighbors = [
                { x: 0, y: 1 },
                { x: 1, y: 1 },
            ];
            navigation['initializeDistances'] = jest.fn();
            navigation['exploreNeighbors'] = jest.fn();
            navigation['getNeighbors'] = jest.fn().mockReturnValue(neighbors);
        });
        it('should return the closest valid tile', () => {
            navigation['isTileValidForPlayer'] = jest.fn().mockReturnValue(true);
            navigation['getNextNode'] = jest.fn().mockReturnValueOnce(true);
            const closestTile = navigation.findClosestValidTile(mockPlayer, mockRoom);

            expect(closestTile).toEqual({ x: 0, y: 1 });
            expect(navigation['initializeDistances']).toHaveBeenCalledWith(mockPlayer, mockRoom.gameMap);
            expect(navigation['getNextNode']).toHaveBeenCalled();
            expect(navigation['getNeighbors']).toHaveBeenCalled();
        });

        it('should break if no next node', () => {
            navigation['getNextNode'] = jest.fn().mockReturnValue(false);
            navigation.findClosestValidTile(mockPlayer, mockRoom);

            expect(navigation['initializeDistances']).toHaveBeenCalledWith(mockPlayer, mockRoom.gameMap);
            expect(navigation['getNextNode']).toHaveBeenCalled();
        });

        it('should call explore neighbors', () => {
            navigation['getNextNode'] = jest.fn().mockReturnValueOnce(true);
            navigation['isTileValidForPlayer'] = jest.fn().mockReturnValue(false);

            navigation.findClosestValidTile(mockPlayer, mockRoom);

            expect(navigation['initializeDistances']).toHaveBeenCalledWith(mockPlayer, mockRoom.gameMap);
            expect(navigation['exploreNeighbors']).toHaveBeenCalled();
        });
    });
});
