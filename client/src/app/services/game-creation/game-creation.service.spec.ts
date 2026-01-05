import { TestBed } from '@angular/core/testing';
import { SIZE_LARGE_MAP, SIZE_MEDIUM_MAP, SIZE_SMALL_MAP } from '@app/constants';
import { mockGames } from '@app/mocks/mock-game';
import { mockSmallGrid } from '@app/mocks/mock-map';
import { GameCreationService } from '@app/services/game-creation/game-creation.service';
import { GameTileInfoService } from '@app/services/game-tile-info/game-tile-info.service';
import { NavigationService } from '@app/services/navigation/navigation.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { GameMode, MapSize } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { ClientToServerEvent } from '@common/socket.events';

describe('GameCreationService', () => {
    let service: GameCreationService;
    let game: Game;
    let navigationServiceSpy: jasmine.SpyObj<NavigationService>;
    let socketCommunicationServiceSpy: jasmine.SpyObj<SocketCommunicationService>;
    let gameTileInfoServiceSpy: jasmine.SpyObj<GameTileInfoService>;
    beforeEach(() => {
        gameTileInfoServiceSpy = jasmine.createSpyObj('GameTileInfoService', ['selectedRow', 'selectedCol']);
        socketCommunicationServiceSpy = jasmine.createSpyObj('SocketCommunicationService', ['on', 'send']);
        navigationServiceSpy = jasmine.createSpyObj('NavigationService', ['isDebugMode']);

        TestBed.configureTestingModule({
            providers: [
                { provide: NavigationService, useValue: navigationServiceSpy },
                { provide: SocketCommunicationService, useValue: socketCommunicationServiceSpy },
                { provide: GameTileInfoService, useValue: gameTileInfoServiceSpy },
            ],
        });
        service = TestBed.inject(GameCreationService);
        game = mockGames[0];
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('deepCopyMatrix', () => {
        it('should return a deep copy of the matrix', () => {
            const matrix = [
                [1, 2],
                [2, 0],
            ];
            const result = service.deepCopyMatrix(matrix);
            expect(result).toEqual(matrix);
            expect(result).not.toBe(matrix);
        });

        it('should return an empty array if matrix is undefined', () => {
            const result = service.deepCopyMatrix(null);
            expect(result).toEqual([]);
        });
    });

    it('should select the right size', () => {
        service.setSelectedSize(MapSize.Small);
        expect(service.sizeSubject.getValue()).toEqual(MapSize.Small);
    });

    it('should return the right game mode', () => {
        service.gameMode = GameMode.Classic;
        expect(service.getGameMode()).toEqual(GameMode.Classic);
    });

    it('should update map dimensions when size is small', () => {
        service.setSelectedSize(MapSize.Small);
        expect(service.updateDimensions()).toEqual(SIZE_SMALL_MAP);
    });

    it('should update map dimensions when size is medium', () => {
        service.setSelectedSize(MapSize.Medium);
        expect(service.updateDimensions()).toEqual(SIZE_MEDIUM_MAP);
    });

    it('should update map dimensions when size is large', () => {
        service.setSelectedSize(MapSize.Large);
        expect(service.updateDimensions()).toEqual(SIZE_LARGE_MAP);
    });

    it('should return "Small" for SIZE_SMALL_MAP', () => {
        game.dimension = SIZE_SMALL_MAP;
        const result = service.convertMapDimension(game);
        expect(result).toBe(MapSize.Small);
    });

    it('should return "Medium" for SIZE_MEDIUM_MAP', () => {
        game.dimension = SIZE_MEDIUM_MAP;
        const result = service.convertMapDimension(game);
        expect(result).toBe(MapSize.Medium);
    });

    it('should return "Large" for SIZE_LARGE_MAP', () => {
        game.dimension = SIZE_LARGE_MAP;
        const result = service.convertMapDimension(game);
        expect(result).toBe(MapSize.Large);
    });

    it('should return "none" for unknown dimensions', () => {
        game.dimension = -1;
        const result = service.convertMapDimension(game);
        expect(result).toBe('none');
    });

    it('should return the correct array depending on isnewGame', () => {
        service.isNewGame = false;
        service.loadedTiles = [[1, 1]];
        expect(service.resetGrid(SIZE_SMALL_MAP, [[1, 1]])).toEqual(service.loadedTiles);

        service.isNewGame = true;
        expect(service.resetGrid(SIZE_SMALL_MAP, [[1, 1]])).toEqual(mockSmallGrid);
    });

    it('should return to correct boolean for teleportation', () => {
        service.isModifiable = false;
        navigationServiceSpy.isDebugMode = true;
        expect(service.canTeleport(true, true)).toBeTrue();

        service.isModifiable = true;
        expect(service.canTeleport(false, true)).toBeFalse();
    });

    it('should return the correct array of booleans', () => {
        const position = { x: 0, y: 0 };
        const teleportSpy = spyOn(service, 'canTeleport');
        teleportSpy.and.returnValue(true);
        expect(service.rightClick(position, true, true)).toEqual([false]);
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ClientToServerEvent.TeleportPlayer, position);

        teleportSpy.and.returnValue(false);
        spyOn(service, 'showDetails').and.returnValue(true);
        expect(service.rightClick(position, true, true)).toEqual([false, true]);
    });

    it('showDetails should return the correct boolean', () => {
        service.isModifiable = false;
        expect(service.showDetails({ x: 0, y: 0 })).toBeTrue();
        expect(socketCommunicationServiceSpy.send).toHaveBeenCalledWith(ClientToServerEvent.GetRoom);
        expect(gameTileInfoServiceSpy.selectedCol).toEqual(0);
        expect(gameTileInfoServiceSpy.selectedRow).toEqual(0);

        service.isModifiable = true;
        expect(service.showDetails({ x: 0, y: 0 })).toBeFalse();
    });

    it('should return a copy of the tiles', () => {
        service.loadedTiles = [[1, 1]];
        expect(service.loadExistingTiles()).toEqual(service.deepCopyMatrix(service.loadedTiles));
    });

    it('should return a copy of loadedObjects', () => {
        service.loadedObjects = [[0, 0]];
        expect(service.loadExistingObjects()).toEqual(service.deepCopyMatrix(service.loadedObjects));
    });
});
