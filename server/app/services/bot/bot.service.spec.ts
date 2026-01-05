import { BOT_NAVIGATION_RANDOM, FORWARD_TIME, MAX_RANGE, RANDOM_INT, SIZE_LARGE_MAP, SIZE_SMALL_MAP } from '@app/constants';
import { mockRoom } from '@app/mocks/mock-room';
import { mockServer } from '@app/mocks/mock-server';
import { ObjectType } from '@common/avatars-info';
import { Behavior, Player, Position, Status } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { ServerToClientEvent } from '@common/socket.events';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { BotService } from './bot.service';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
describe('BotService', () => {
    let service: BotService;
    let mockPlayer: Player[];
    let mockTarget: Player[];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [BotService],
        }).compile();

        service = module.get<BotService>(BotService);
        mockPlayer = [{ id: '123', username: 'abc' } as unknown as Player];
        mockTarget = [{ id: '222', username: 'Target' } as unknown as Player];
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should process bot turn', async () => {
        jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);
        const processAggressiveBehaviorMock = jest.spyOn(service as any, 'processAggressiveBehavior').mockResolvedValue(undefined);
        mockPlayer[0].behavior = Behavior.Aggressive;
        await service.processBotTurn(mockRoom, mockServer, mockPlayer[0]);
        expect(processAggressiveBehaviorMock).toHaveBeenCalledWith(mockRoom, mockServer, mockPlayer[0]);
    });

    it('should process defensive bot turn', async () => {
        jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);
        const processDefBehaviorMock = jest.spyOn(service as any, 'processDefensiveBehavior').mockResolvedValue(undefined);
        mockPlayer[0].behavior = Behavior.Defensive;
        await service.processBotTurn(mockRoom, mockServer, mockPlayer[0]);
        expect(processDefBehaviorMock).toHaveBeenCalledWith(mockRoom, mockServer, mockPlayer[0]);
    });

    it('should process aggressive behavior', async () => {
        mockRoom.navigation.findReachableTiles = jest.fn().mockReturnValue([]);
        mockRoom.navigation.findClosestPlayer = jest.fn().mockReturnValue(undefined);
        const checkEndGameMock = jest.spyOn(service as any, 'checkEndGame').mockReturnValue(false);
        const findFlagMock = jest.spyOn(service as any, 'findFlag').mockReturnValue(undefined);
        const checkForAttackItemsMock = jest.spyOn(service as any, 'checkForAttackItems').mockReturnValue(undefined);
        const navigateToRandomTileMock = jest.spyOn(service as any, 'navigateToRandomTile').mockResolvedValue(undefined);
        await (service as any).processAggressiveBehavior(mockRoom, mockServer, mockPlayer[0]);
        expect(mockRoom.navigation.findReachableTiles).toHaveBeenCalledWith(mockPlayer[0], mockRoom);
        expect(mockRoom.navigation.findClosestPlayer).toHaveBeenCalledWith(mockPlayer[0], mockRoom.listPlayers, mockRoom);
        expect(checkEndGameMock).toHaveBeenCalled();
        expect(findFlagMock).toHaveBeenCalled();
        expect(checkForAttackItemsMock).toHaveBeenCalled();
        expect(navigateToRandomTileMock).toHaveBeenCalled();
    });

    it('should return to spawn point if has the flag', async () => {
        jest.spyOn(service as any, 'checkEndGame').mockReturnValue(true);
        jest.spyOn(service as any, 'checkForSpawn').mockReturnValue({ x: 0, y: 0 });
        const navigateToItemMock = jest.spyOn(service as any, 'navigateToItem').mockResolvedValue(true);
        await (service as any).processAggressiveBehavior(mockRoom, mockServer, mockPlayer[0]);
        expect(navigateToItemMock).toHaveBeenCalledWith(mockServer, mockRoom, mockPlayer[0], { x: 0, y: 0 });
    });

    it('should navigate to flag if flag is found', async () => {
        jest.spyOn(service as any, 'checkEndGame').mockReturnValue(false);
        jest.spyOn(service as any, 'findFlag').mockReturnValue({ x: 1, y: 1 });
        const navigateToItemMock = jest.spyOn(service as any, 'navigateToItem').mockResolvedValue(true);
        await (service as any).processAggressiveBehavior(mockRoom, mockServer, mockPlayer[0]);
        expect(navigateToItemMock).toHaveBeenCalledWith(mockServer, mockRoom, mockPlayer[0], { x: 1, y: 1 });
    });

    it('should attack enemy if possible', async () => {
        jest.spyOn(service as any, 'checkEndGame').mockReturnValue(false);
        jest.spyOn(service as any, 'findFlag').mockReturnValue(undefined);
        const target = mockTarget[0];
        jest.spyOn(mockRoom.navigation, 'findClosestPlayer').mockReturnValue(target);
        const attackEnemyIfPossibleMock = jest.spyOn(service as any, 'attackEnemyIfPossible').mockResolvedValue(true);
        await (service as any).processAggressiveBehavior(mockRoom, mockServer, mockPlayer[0]);
        expect(attackEnemyIfPossibleMock).toHaveBeenCalledWith(mockRoom, mockServer, mockPlayer[0], target);
    });

    it('should navigate to item if item is found', async () => {
        jest.spyOn(service as any, 'checkEndGame').mockReturnValue(false);
        jest.spyOn(service as any, 'findFlag').mockReturnValue(undefined);
        jest.spyOn(mockRoom.navigation, 'findClosestPlayer').mockReturnValue(undefined);
        jest.spyOn(service as any, 'checkForAttackItems').mockReturnValue({ x: 1, y: 1 });
        const navigateToItemMock = jest.spyOn(service as any, 'navigateToItem').mockResolvedValue(true);
        await (service as any).processAggressiveBehavior(mockRoom, mockServer, mockPlayer[0]);
        expect(navigateToItemMock).toHaveBeenCalledWith(mockServer, mockRoom, mockPlayer[0], { x: 1, y: 1 });
    });

    it('should process defenssive behavior', async () => {
        mockRoom.navigation.findReachableTiles = jest.fn().mockReturnValue([]);
        mockRoom.navigation.findClosestPlayer = jest.fn().mockReturnValue(undefined);
        const checkEndGameMock = jest.spyOn(service as any, 'checkEndGame').mockReturnValue(false);
        const findFlagMock = jest.spyOn(service as any, 'findFlag').mockReturnValue(undefined);
        const navigateToRandomTileMock = jest.spyOn(service as any, 'navigateToRandomTile').mockResolvedValue(undefined);
        await (service as any).processDefensiveBehavior(mockRoom, mockServer, mockPlayer[0]);
        expect(mockRoom.navigation.findReachableTiles).toHaveBeenCalledWith(mockPlayer[0], mockRoom);
        expect(mockRoom.navigation.findClosestPlayer).toHaveBeenCalledWith(mockPlayer[0], mockRoom.listPlayers, mockRoom);
        expect(checkEndGameMock).toHaveBeenCalled();
        expect(findFlagMock).toHaveBeenCalled();
        expect(navigateToRandomTileMock).toHaveBeenCalled();
    });

    it('should return to spawn point if has the flag', async () => {
        jest.spyOn(service as any, 'checkEndGame').mockReturnValue(true);
        jest.spyOn(service as any, 'checkForSpawn').mockReturnValue({ x: 0, y: 0 });
        const navigateToItemMock = jest.spyOn(service as any, 'navigateToItem').mockResolvedValue(true);
        await (service as any).processDefensiveBehavior(mockRoom, mockServer, mockPlayer[0]);
        expect(navigateToItemMock).toHaveBeenCalledWith(mockServer, mockRoom, mockPlayer[0], { x: 0, y: 0 });
    });

    it('should navigate to flag if flag is found', async () => {
        jest.spyOn(service as any, 'checkEndGame').mockReturnValue(false);
        jest.spyOn(service as any, 'findFlag').mockReturnValue({ x: 1, y: 1 });
        const navigateToItemMock = jest.spyOn(service as any, 'navigateToItem').mockResolvedValue(true);
        await (service as any).processDefensiveBehavior(mockRoom, mockServer, mockPlayer[0]);
        expect(navigateToItemMock).toHaveBeenCalledWith(mockServer, mockRoom, mockPlayer[0], { x: 1, y: 1 });
    });

    it('should attack enemy if possible', async () => {
        jest.spyOn(service as any, 'checkEndGame').mockReturnValue(false);
        jest.spyOn(service as any, 'findFlag').mockReturnValue(undefined);
        const target = mockTarget[0];
        jest.spyOn(mockRoom.navigation, 'findClosestPlayer').mockReturnValue(target);
        const attackEnemyIfPossibleMock = jest.spyOn(service as any, 'attackEnemyIfPossible').mockResolvedValue(true);
        await (service as any).processDefensiveBehavior(mockRoom, mockServer, mockPlayer[0]);
        expect(attackEnemyIfPossibleMock).toHaveBeenCalledWith(mockRoom, mockServer, mockPlayer[0], target);
    });

    it('should navigate to item if item is found', async () => {
        jest.spyOn(service as any, 'checkEndGame').mockReturnValue(false);
        jest.spyOn(service as any, 'findFlag').mockReturnValue(undefined);
        jest.spyOn(mockRoom.navigation, 'findClosestPlayer').mockReturnValue(undefined);
        jest.spyOn(service as any, 'checkForDefenseItems').mockReturnValue({ x: 1, y: 1 });
        const navigateToItemMock = jest.spyOn(service as any, 'navigateToItem').mockResolvedValue(true);
        await (service as any).processDefensiveBehavior(mockRoom, mockServer, mockPlayer[0]);
        expect(navigateToItemMock).toHaveBeenCalledWith(mockServer, mockRoom, mockPlayer[0], { x: 1, y: 1 });
    });

    it('should attack enemy if possible', async () => {
        const path = [{ x: 1, y: 1 }];
        jest.spyOn(service as any, 'checkForEnemy').mockReturnValue(path);
        const attackPlayerMock = jest.spyOn(service as any, 'attackPlayer').mockResolvedValue(true);
        await (service as any).attackEnemyIfPossible(mockRoom, mockServer, mockPlayer[0], mockTarget[0]);
        expect(attackPlayerMock).toHaveBeenCalledWith(mockRoom, mockServer, { target: mockTarget[0], activePlayer: mockPlayer[0], path });

        jest.spyOn(service as any, 'checkForEnemy').mockReturnValue(null);
        const result = await (service as any).attackEnemyIfPossible(mockRoom, mockServer, mockPlayer[0], mockTarget[0]);
        expect(result).toBe(false);
    });

    it('should return true if player has a flag and can spawn', () => {
        jest.spyOn(service as any, 'checkForSpawn').mockReturnValue(true);
        const mockPlayerFlag = {
            inventory: [{ id: ObjectType.Flag }],
        } as Player;
        const mockReachability: Position[] = [{ x: 0, y: 0 }];
        const result = (service as any).checkEndGame(mockPlayerFlag, mockReachability);
        expect(result).toBe(true);
    });

    it('should return false if player has a flag but cannot spawn', () => {
        jest.spyOn(service as any, 'checkForSpawn').mockReturnValue(false);
        const mockPlayerFlag = {
            inventory: [{ id: ObjectType.Flag }],
        } as Player;
        const mockReachability: Position[] = [{ x: 0, y: 0 }];
        const result = (service as any).checkEndGame(mockPlayerFlag, mockReachability);
        expect(result).toBe(false);
    });

    it('should return the position of the flag if it is in reachability', () => {
        const mockRoomFlag = {
            gameMap: {
                itemPlacement: [
                    [0, 0, 0],
                    [0, ObjectType.Flag, 0],
                    [0, 0, 0],
                ],
            },
        } as unknown as Room;
        const mockReachability: Position[] = [
            { x: 1, y: 1 },
            { x: 0, y: 0 },
        ];
        const result = (service as any).findFlag(mockRoomFlag, mockReachability);
        expect(result).toEqual({ x: 1, y: 1 });
    });

    it('should return undefined if no flag is in reachability', () => {
        const mockRoomEmpty = {
            gameMap: {
                itemPlacement: [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, 0],
                ],
            },
        } as unknown as Room;
        const mockReachability: Position[] = [
            { x: 1, y: 1 },
            { x: 0, y: 0 },
        ];
        const result = (service as any).findFlag(mockRoomEmpty, mockReachability);
        expect(result).toBeUndefined();
    });

    it('should emit a BotNavigation event for a valid random tile', () => {
        const mockReachability: Position[] = [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ];
        jest.spyOn(global.Math, 'random').mockReturnValue(BOT_NAVIGATION_RANDOM);
        jest.spyOn(service as any, 'isValidPosition').mockReturnValue(true);
        const mockPath = [
            { x: 2, y: 2 },
            { x: 1, y: 1 },
        ];
        const findFastestPathMock = jest.spyOn(mockRoom.navigation, 'findFastestPath').mockReturnValue(mockPath);
        const emitMock = jest.fn();
        mockServer.to = jest.fn().mockReturnValue({ emit: emitMock });
        (service as any).navigateToRandomTile(mockRoom, mockServer, mockPlayer[0], mockReachability);
        expect(findFastestPathMock).toHaveBeenCalledWith(mockPlayer[0], { x: 2, y: 2 }, mockRoom);
        expect(mockServer.to).toHaveBeenCalledWith(mockRoom.roomId);
        expect(emitMock).toHaveBeenCalledWith(ServerToClientEvent.BotNavigation, mockPath);
    });

    it('should not emit a BotNavigation event if reachability is empty', () => {
        const mockReachability: Position[] = [];
        const emitMock = jest.fn();
        mockServer.to = jest.fn().mockReturnValue({ emit: emitMock });
        (service as any).navigateToRandomTile(mockRoom, mockServer, mockPlayer[0], mockReachability);
        expect(mockServer.to).not.toHaveBeenCalled();
        expect(emitMock).not.toHaveBeenCalled();
    });

    it('should return the correct boolean for the validPosition', () => {
        const mockRoomGameTiles = {
            gameMap: {
                dimension: SIZE_SMALL_MAP,
            },
        } as unknown as Room;
        const mockPosition = { x: 1, y: 1 };
        const result = (service as any).isValidPosition(mockPosition, mockRoomGameTiles);
        expect(result).toBe(true);

        mockPosition.x = SIZE_LARGE_MAP;
        const falseResult = (service as any).isValidPosition(mockPosition, mockRoomGameTiles);
        expect(falseResult).toBe(false);
    });

    it('should not emit a BotNavigation event for an invalid position', () => {
        const mockReachability: Position[] = [{ x: 1, y: 1 }];
        jest.spyOn(service as any, 'isValidPosition').mockReturnValue(false);
        const emitMock = jest.fn();
        mockServer.to = jest.fn().mockReturnValue({ emit: emitMock });
        (service as any).navigateToRandomTile(mockRoom, mockServer, mockPlayer[0], mockReachability);
        expect(mockServer.to).not.toHaveBeenCalled();
        expect(emitMock).not.toHaveBeenCalled();
    });

    it('should emit BotNavigation and BotAttack events for a non-bot target', async () => {
        jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);
        const mockRoomName = {
            roomId: 'room-1',
        } as unknown as Room;

        const mockPath = [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ];
        const mockTargetId = { id: 'player-1', position: { x: 3, y: 3 }, status: 'active' } as unknown as Player;
        const mockActivePlayer = { position: { x: 3, y: 2 } } as unknown as Player;
        jest.spyOn(service as any, 'isNeighbour').mockReturnValue(true);
        await (service as any).attackPlayer(mockRoomName, mockServer, {
            target: mockTargetId,
            activePlayer: mockActivePlayer,
            path: [...mockPath],
        });

        expect(mockServer.to).toHaveBeenCalledWith(mockRoomName.roomId);
        expect(mockServer.to(mockRoomName.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.BotNavigation, [{ x: 1, y: 1 }]);
        expect(mockServer.to).toHaveBeenCalledWith(mockTargetId.id);
        expect(mockServer.to(mockTargetId.id).emit).toHaveBeenCalledWith(ServerToClientEvent.BotAttack, {
            clickedPosition: mockTargetId.position,
            player: mockActivePlayer,
        });
    });

    it('should return true if players are neighbors', () => {
        const mockPlayerPos = { position: { x: 1, y: 1 } } as Player;
        const mockTargetPosition = { position: { x: 2, y: 2 } } as Player;
        const result = (service as any).isNeighbour(mockPlayerPos, mockTargetPosition);
        expect(result).toBe(true);
    });

    it('should return false if players are not neighbors', () => {
        const mockPlayerPosition = { position: { x: 1, y: 1 } } as Player;
        const mockTargetPosition = { position: { x: 3, y: 3 } } as Player;
        const result = (service as any).isNeighbour(mockPlayerPosition, mockTargetPosition);
        expect(result).toBe(false);
    });

    it('should return the first active player in the room', () => {
        const mockRoomList = {
            listPlayers: [
                { id: '1', status: Status.Disconnected },
                { id: '2', status: Status.Bot },
                { id: '3', status: 'Active' },
            ],
        } as unknown as Room;
        const result = (service as any).getEventHost(mockRoomList);
        expect(result).toEqual({ id: '3', status: 'Active' });
    });

    it('should return the fastest path between active player and target', () => {
        const mockRoomPath = {
            navigation: {
                findFastestPath: jest.fn().mockReturnValue([
                    { x: 1, y: 1 },
                    { x: 2, y: 2 },
                ]),
            },
        } as unknown as Room;
        const mockActivePlayer = { position: { x: 0, y: 0 } } as Player;
        const mockTargetPosition = { position: { x: 2, y: 2 } } as Player;
        const result = (service as any).checkForEnemy(mockRoomPath, mockActivePlayer, mockTargetPosition);
        expect(mockRoomPath.navigation.findFastestPath).toHaveBeenCalledWith(mockActivePlayer, mockTargetPosition.position, mockRoomPath);
        expect(result).toEqual([
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ]);
    });

    it('should return the position of the first attack item', () => {
        const mockRoomGameItems = {
            gameMap: {
                itemPlacement: [
                    [0, 0, ObjectType.Lightning],
                    [0, 0, 0],
                    [0, 0, 0],
                ],
            },
        } as unknown as Room;
        const mockReachability: Position[] = [
            { x: 0, y: 2 },
            { x: 1, y: 1 },
        ];
        jest.spyOn(service as any, 'isAttackItem').mockImplementation((item) => item === ObjectType.Lightning);
        const result = (service as any).checkForAttackItems(mockRoomGameItems, mockReachability);
        expect(result).toEqual({ x: 0, y: 2 });
    });

    it('should fall back to checkForAnyItems if no attack items are found', () => {
        const mockRoomItems = {
            gameMap: {
                itemPlacement: [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, ObjectType.Flag],
                ],
            },
        } as unknown as Room;

        const mockReachability: Position[] = [{ x: 2, y: 2 }];

        jest.spyOn(service as any, 'isAttackItem').mockReturnValue(false);
        jest.spyOn(service as any, 'checkForAnyItems').mockReturnValue({ x: 2, y: 2 });

        const result = (service as any).checkForAttackItems(mockRoomItems, mockReachability);

        expect(result).toEqual({ x: 2, y: 2 });
    });

    it('should return true for an attack item', () => {
        expect(service['isAttackItem'](ObjectType.Lightning)).toBe(true);
        expect(service['isAttackItem'](ObjectType.Xiphos)).toBe(true);
        expect(service['isAttackItem'](ObjectType.Sandal)).toBe(true);
        expect(service['isAttackItem'](ObjectType.Armor)).toBe(true);
    });

    it('should return the spawn position if it is in reachability', () => {
        const mockPlayerSpawnPosition = {
            spawnPosition: { x: 1, y: 1 },
        } as Player;
        const mockReachability: Position[] = [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ];
        const result = (service as any).checkForSpawn(mockReachability, mockPlayerSpawnPosition);
        expect(result).toEqual({ x: 1, y: 1 });
    });

    it('should return the position of the first defense item', () => {
        const mockRoomItems = {
            gameMap: {
                itemPlacement: [
                    [0, 0, ObjectType.Kunee],
                    [0, 0, 0],
                    [0, ObjectType.Trident, 0],
                ],
            },
        } as unknown as Room;
        const mockReachability: Position[] = [
            { x: 0, y: 2 },
            { x: 2, y: 1 },
        ];
        const result = (service as any).checkForDefenseItems(mockRoomItems, mockReachability);
        expect(result).toEqual({ x: 0, y: 2 });
    });

    it('should fall back to checkForAnyItems if no defense items are found', () => {
        const mockRoomItems = {
            gameMap: {
                itemPlacement: [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, ObjectType.Flag],
                ],
            },
        } as unknown as Room;
        const mockReachability: Position[] = [{ x: 2, y: 2 }];
        jest.spyOn(service as any, 'checkForAnyItems').mockReturnValue({ x: 2, y: 2 });
        const result = (service as any).checkForDefenseItems(mockRoomItems, mockReachability);
        expect(result).toEqual({ x: 2, y: 2 });
    });

    it('should return the position of the first non-spawn item', () => {
        const mockRoomItems = {
            gameMap: {
                itemPlacement: [
                    [0, ObjectType.Spawn, 0],
                    [0, ObjectType.Flag, 0],
                    [0, 0, 0],
                ],
            },
        } as unknown as Room;
        const mockReachability: Position[] = [
            { x: 1, y: 1 },
            { x: 0, y: 1 },
        ];
        const result = (service as any).checkForAnyItems(mockRoomItems, mockReachability);
        expect(result).toEqual({ x: 1, y: 1 });
    });

    it('should resolve after the specified time', async () => {
        jest.useFakeTimers();
        const delayPromise = (service as any).delay(FORWARD_TIME);
        jest.advanceTimersByTime(FORWARD_TIME);
        await expect(delayPromise).resolves.toBeUndefined();
        jest.useRealTimers();
    });

    it('should return a random integer within the range', () => {
        jest.spyOn(global.Math, 'random').mockReturnValue(BOT_NAVIGATION_RANDOM);
        const result = (service as any).getRandomInt(1, RANDOM_INT);
        expect(result).toBe(MAX_RANGE);
    });

    it('should emit BotNavigation event and return true when a path is found', () => {
        const mockRoomPath = {
            roomId: 'room-1',
            navigation: {
                findFastestPath: jest.fn().mockReturnValue([
                    { x: 1, y: 1 },
                    { x: 2, y: 2 },
                ]),
            },
        } as unknown as Room;
        const mockServer2 = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as unknown as Server;
        const mockActivePlayer = { position: { x: 0, y: 0 } } as Player;
        const mockItem = { x: 2, y: 2 } as Position;
        const result = (service as any).navigateToItem(mockServer2, mockRoomPath, mockActivePlayer, mockItem);
        expect(mockRoomPath.navigation.findFastestPath).toHaveBeenCalledWith(mockActivePlayer, mockItem, mockRoomPath);
        expect(mockServer2.to).toHaveBeenCalledWith(mockRoomPath.roomId);
        expect(mockServer2.to(mockRoomPath.roomId).emit).toHaveBeenCalledWith(ServerToClientEvent.BotNavigation, [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
        ]);
        expect(result).toBe(true);

        const mockRoomEmptyPath = {
            roomId: 'room-1',
            navigation: {
                findFastestPath: jest.fn().mockReturnValue(null),
            },
        } as unknown as Room;
        const resultEmptyPath = (service as any).navigateToItem(mockServer2, mockRoomEmptyPath, mockActivePlayer, mockItem);
        expect(resultEmptyPath).toBe(false);
    });
});
