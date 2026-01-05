/* eslint-disable  @typescript-eslint/no-non-null-assertion */
import { TestBed } from '@angular/core/testing';
import { ObjectType } from '@app/constants';
import { mockPlayers } from '@app/mocks/mock-players';
import { mockRoom } from '@app/mocks/mock-room';
import { GameTileInfoService } from '@app/services/game-tile-info/game-tile-info.service';
import { NavigationService } from '@app/services/navigation/navigation.service';
import { TileService } from '@app/services/tile/tile.service';
import { Player } from '@common/interfaces/player';
import { Room } from '@common/interfaces/room';
import { gameObjects } from '@common/objects-info';
import { gameTiles } from '@common/tile-info';

describe('GameTileInfoService', () => {
    let service: GameTileInfoService;
    let tileServiceSpy: jasmine.SpyObj<TileService>;
    let navigationServiceSpy: jasmine.SpyObj<NavigationService>;

    beforeEach(() => {
        tileServiceSpy = jasmine.createSpyObj('TileService', ['getTileImage']);
        navigationServiceSpy = jasmine.createSpyObj('NavigationService', ['players']);
        TestBed.configureTestingModule({
            providers: [
                GameTileInfoService,
                { provide: TileService, useValue: tileServiceSpy },
                { provide: NavigationService, useValue: navigationServiceSpy },
            ],
        });

        service = TestBed.inject(GameTileInfoService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getItem', () => {
        it('should return null if itemId is 0', () => {
            service.itemId = 0;
            expect(service.getItem()).toBeNull();
        });

        it('should get the item', () => {
            const trident = gameObjects.find((items) => items.id === ObjectType.Trident);
            service.itemId = ObjectType.Trident;
            expect(service.getItem()).toEqual(trident!);
        });

        it('should return undefined if itemId exceeds gameObjects array length', () => {
            service.itemId = gameObjects.length + 1;
            expect(service.getItem()).toBeNull();
        });
    });

    describe('getTile', () => {
        it('should return the correct game tile if tileId is valid', () => {
            service.tileId = 1;
            expect(service.getTile()).toEqual(gameTiles[0]);
        });

        it('should return null if tileId exceeds gameTiles array length', () => {
            service.tileId = gameTiles.length + 1;
            expect(service.getTile()).toBeNull();
        });
    });

    describe('getPlayer', () => {
        it('should return undefined if no player is on the selected tile', () => {
            navigationServiceSpy.players = mockPlayers;
            service.selectedRow = 2;
            service.selectedCol = 2;
            mockRoom.listPlayers = mockPlayers;
            expect(service.getPlayer(mockRoom)).toBeUndefined();
        });

        it('should return the player if one is on the selected tile', () => {
            const mockPlayer = mockPlayers[0];

            navigationServiceSpy.players = mockPlayers;

            service.selectedRow = 0;
            service.selectedCol = 0;
            mockPlayers[0].position.x = 0;
            mockPlayers[0].position.y = 0;
            mockRoom.listPlayers = mockPlayers;
            expect(service.getPlayer(mockRoom)).toEqual(mockPlayer);
        });

        it('should return undefined if player positions do not match selectedRow and selectedCol', () => {
            navigationServiceSpy.players = mockPlayers;

            service.selectedRow = 2;
            service.selectedCol = 2;
            mockRoom.listPlayers = mockPlayers;
            expect(service.getPlayer(mockRoom)).toBeUndefined();
        });
    });

    describe('getPlayer', () => {
        it('should return the correct player when a match is found', () => {
            service.selectedRow = 2;
            service.selectedCol = 1;
            const mockPlayer = { position: { x: 2, y: 1 }, name: 'Player 1' } as Player;
            const room = {
                listPlayers: [mockPlayer, { position: { x: 1, y: 1 }, name: 'Player 2' }],
            } as Room;
            const result = service.getPlayer(room);
            expect(result).toEqual(mockPlayer);
        });

        it('should return undefined when no player matches the position', () => {
            service.selectedRow = 0;
            service.selectedCol = 0;
            const room = {
                listPlayers: [
                    { position: { x: 1, y: 1 }, name: 'Player 1' },
                    { position: { x: 2, y: 2 }, name: 'Player 2' },
                ],
            } as Room;
            const result = service.getPlayer(room);
            expect(result).toBeUndefined();
        });
    });

    it('should correctly transfer data from the room to the service properties', () => {
        service.selectedRow = 1;
        service.selectedCol = 2;

        const mockTileId = 0;
        const mockItemId = 2;
        const player = mockPlayers[0];
        player.position = { x: 1, y: 2 };
        const room = mockRoom;
        room.gameMap.tiles[1][2] = mockTileId;
        room.gameMap.itemPlacement[1][2] = mockItemId;
        spyOn(service, 'getPlayer').and.returnValue(player);
        service.transferRoomData(room);
        expect(service.tileId).toBe(mockTileId);
        expect(service.itemId).toBe(mockItemId);
        expect(service.selectedPlayer).toEqual(player);
    });
});
