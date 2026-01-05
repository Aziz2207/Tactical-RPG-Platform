import { TestBed } from '@angular/core/testing';
import { SIZE_SMALL_MAP } from '@app/constants';
import { mockMediumItemsMatrice, mockObjectsMatrice } from '@app/mocks/mock-game';
import { mockGameNavigation as mockGame } from '@app/mocks/mock-map';
import { playerNavigation as player, playerNavigation } from '@app/mocks/mock-player';
import { mockPlayers } from '@app/mocks/mock-players';
import { mockRoom } from '@app/mocks/mock-room';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { avatars } from '@common/avatars-info';
import { ObjectType, TileType } from '@common/constants';
import { NavigationService } from './navigation.service';
/* eslint-disable  @typescript-eslint/no-explicit-any */

describe('NavigationServiceService', () => {
    let service: NavigationService;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;

    beforeEach(() => {
        socketCommunicationServiceSpy = jasmine.createSpyObj(SocketCommunicationService, ['send', 'emit']);
        TestBed.configureTestingModule({
            providers: [{ provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy }],
        });
        service = TestBed.inject(NavigationService);
        service.initialize(mockRoom, mockRoom.gameMap.itemPlacement);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set the objects', () => {
        service.updateObjects(mockMediumItemsMatrice);
        expect(service.objects).toEqual(JSON.parse(JSON.stringify(mockMediumItemsMatrice)));
    });

    it('should update the tile to spawn', () => {
        spyOn(service, 'isInInitialPosition').and.returnValue(true);
        service.updateTile(playerNavigation);
        expect(service.positions[playerNavigation.position.x][playerNavigation.position.y]).toBe(ObjectType.Spawn);
    });

    it('should update the tile to the object', () => {
        spyOn(service, 'getObject').and.returnValue(ObjectType.Kunee);
        spyOn(service, 'isObject').and.returnValue(true);
        spyOn(service, 'isInInitialPosition').and.returnValue(false);
        service.updateTile(playerNavigation);
        expect(service.positions[playerNavigation.position.x][playerNavigation.position.y]).toBe(ObjectType.Kunee);
    });

    it('should put 0 if the object is spawn', () => {
        service.objects = mockObjectsMatrice;
        service.initializeObjects(mockObjectsMatrice);
        expect(service.objects[0][0]).toEqual(0);
        expect(service.objects[0][1]).toEqual(0);
    });

    it('should update tile with 0 if other conditions fail', () => {
        spyOn(service, 'isObject').and.returnValue(false);
        spyOn(service, 'isInInitialPosition').and.returnValue(false);
        service.updateTile(playerNavigation);
        expect(service.positions[playerNavigation.position.x][playerNavigation.position.y]).toBe(0);
    });

    it('should update this.players', () => {
        service.players = mockPlayers;
        const numberOfPlayers = service.players.length;
        service.removePlayer(playerNavigation);
        expect(service.players.length).toBe(numberOfPlayers);
    });

    it('should remove the player from this.positions', () => {
        service.removePlayer(playerNavigation);
        expect(service.positions[playerNavigation.position.x][playerNavigation.position.y]).toBe(0);
    });

    it('should return false if the tile is not reachable', () => {
        service['reachableTiles'] = [{ x: 1, y: 1 }];
        const result = service.isReachableTile({ row: 2, col: 2 });
        expect(result).toBeFalse();
    });

    it('should return true if the tile is reachable', () => {
        service['reachableTiles'] = [{ x: 1, y: 1 }];
        const result = service.isReachableTile({ row: 1, col: 1 });
        expect(result).toBeTrue();
    });

    it('should return true if there is neighbor', () => {
        spyOn(service, 'getNeighbors').and.returnValue([{ x: 1, y: 1 }]);
        expect(service.isNeighbor({ x: 1, y: 1 }, playerNavigation)).toBeTrue();
    });

    it('should return false if there is no neighbor', () => {
        spyOn(service, 'getNeighbors').and.returnValue([{ x: 1, y: 1 }]);
        expect(service.isNeighbor({ x: 0, y: 0 }, playerNavigation)).toBeFalse();
    });

    it('should get the neighbors', () => {
        spyOn<any>(service, 'isValidTile').and.returnValue(true);
        const result = service.getNeighbors({ x: 0, y: 0 }, mockGame);
        expect(result).toBeDefined();
    });

    it('should return true if tile is valid', () => {
        const result = service['isValidTile'](1, 1, SIZE_SMALL_MAP);
        expect(result).toBeTrue();
    });

    it('should return false if tile is not valid', () => {
        let result = service['isValidTile'](-1, 2, SIZE_SMALL_MAP);
        expect(result).toBeFalse();

        result = service['isValidTile'](1, -1, SIZE_SMALL_MAP);
        expect(result).toBeFalse();

        result = service['isValidTile'](1, 1, 0);
        expect(result).toBeFalse();
    });

    it('should return true if the position contains an object ', () => {
        service['objects'][0][0] = ObjectType.Kunee;
        expect(service.isObject({ x: 0, y: 0 })).toBeTrue();
    });

    it('should return the object at the position ', () => {
        service['objects'] = [[1, 0]];
        expect(service.getObject({ x: 0, y: 0 })).toEqual(1);
    });

    it('should return the position of the players ', () => {
        service.players = [player];
        expect(service.placePlayers()).toEqual([{ x: 0, y: 0 }]);
    });

    it('should return false if the position is not within the bounds ', () => {
        expect(service.isPositionWithinBounds(0, 0, mockGame.tiles)).toBeTrue();
    });

    it('should return the correct ObjectType for known god names', () => {
        expect(service.getPortraitId('Hestia')).toBe(ObjectType.Hestia);
    });

    it('should return an the Spawn if the god string is empty', () => {
        const result = service.getPortraitId('');
        expect(result).toEqual(ObjectType.Spawn);
    });

    it('should return the spawn for unknown names', () => {
        expect(service.getPortraitId('')).toBe(ObjectType.Spawn);
    });

    it('should return the correct boolean depending on the position of the player', () => {
        service.players = mockPlayers;
        expect(service.isInInitialPosition({ x: 0, y: 0 })).toBeTrue();
        expect(service.isInInitialPosition({ x: 2, y: 2 })).toBeFalse();
    });

    it('should return the correct thing on handleInventoryEvent', () => {
        service.players = mockPlayers;
        expect(service.handleInventoryEvent(mockPlayers[0], mockPlayers[1])).toEqual(mockPlayers[1]);
        expect(service.handleInventoryEvent(mockPlayers[0], undefined)).toBeUndefined();
    });

    it('should modify objects with the portraits', () => {
        const objects = [[0, 0]];
        const players = [{ ...mockPlayers[0] }];
        players[0].position = { x: 0, y: 0 };
        players[0].avatar = avatars[0];
        expect(service.displayPortraitsOnSpawnPoints(players, objects)).toEqual([[ObjectType.Hestia, 0]]);
    });

    it('should modify the objects array with the avatar', () => {
        const mockPlayer = { ...mockPlayers[0] };
        mockPlayer.position = { x: 0, y: 0 };
        mockPlayer.avatar = avatars[0];
        const objects = [[0, 0]];
        expect(service.placeAvatar(mockPlayer, objects)).toEqual([[ObjectType.Hestia, 0]]);
    });

    it('should return the array of modified objects and player', () => {
        const position = { x: 0, y: 0 };
        const mockPlayer = { ...mockPlayers[0] };
        const objects = [[0, 0]];
        const result = service.navigateToTile(position, mockPlayer, objects);
        expect(service.reachableTiles).toEqual([]);
        expect(result).toEqual([service.placeAvatar(mockPlayer, objects), mockPlayer]);
    });

    it('should call the necessary functions when respawning a player', () => {
        service.players = [{ ...mockPlayers[0] }];
        const mockPlayer = { ...mockPlayers[0] };
        mockPlayer.avatar = avatars[0];
        mockPlayer.position = { x: 0, y: 0 };
        const position = { x: 0, y: 0 };
        const objects = [[0, 0]];
        expect(service.respawnPlayer(position, mockPlayer, objects)).toEqual(service.placeAvatar(mockPlayer, objects));
    });

    it('should return the correct boolean depending on the position of the player', () => {
        const position = { row: 0, col: 0 };
        const mockPlayer = { ...mockPlayers[0] };
        mockPlayer.position = { x: 0, y: 0 };
        expect(service.isPlayerOnTile(position, mockPlayer)).toBeTrue();

        mockPlayer.position = { x: 1, y: 1 };
        expect(service.isPlayerOnTile(position, mockPlayer)).toBeFalse();
    });

    it('should return the correct boolean for the possibility of interaction', () => {
        const reachableTileSpy = spyOn(service, 'isReachableTile');
        reachableTileSpy.and.returnValue(true);
        const isTileADoorSpy = spyOn(service, 'isTileAClosedDoor');
        isTileADoorSpy.and.returnValue(true);
        const isPlayerOnTileSpy = spyOn(service, 'isPlayerOnTile');
        isPlayerOnTileSpy.and.returnValue(true);
        const position = { row: 0, col: 0 };
        expect(service.isInteractionPossible(position, mockGame.tiles, { ...mockPlayers[0] })).toBeTrue();

        reachableTileSpy.and.returnValue(false);
        expect(service.isInteractionPossible(position, mockGame.tiles, { ...mockPlayers[0] })).toBeFalse();

        isTileADoorSpy.and.returnValue(true);
        expect(service.isInteractionPossible(position, mockGame.tiles, { ...mockPlayers[0] })).toBeFalse();

        reachableTileSpy.and.returnValue(true);
        isTileADoorSpy.and.returnValue(false);
        isPlayerOnTileSpy.and.returnValue(true);
        expect(service.isInteractionPossible(position, mockGame.tiles, { ...mockPlayers[0] })).toBeFalse();
    });

    it('should return the correct boolean depending on if the tile is a closed door or not', () => {
        const tiles = [[TileType.ClosedDoor, 0]];
        const position = { row: 0, col: 0 };
        expect(service.isTileAClosedDoor(tiles, position)).toBeTrue();

        tiles[0][0] = TileType.OpenDoor;
        expect(service.isTileAClosedDoor(tiles, position)).toBeFalse();
    });

    it('should return the correct path depending on where the player is', () => {
        const position = { row: 0, col: 0 };
        const defaultPath = [{ x: 0, y: 1 }];
        const isPlayerOnTileSpy = spyOn(service, 'isPlayerOnTile');
        isPlayerOnTileSpy.and.returnValue(true);
        expect(service.findPath(position, player, defaultPath)).toEqual([]);

        isPlayerOnTileSpy.and.returnValue(false);
        expect(service.findPath(position, player, defaultPath)).toEqual(defaultPath);
    });
});
