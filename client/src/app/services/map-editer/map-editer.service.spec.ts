import { TestBed } from '@angular/core/testing';
import { ClientItem } from '@app/classes/item';
import { ClientMap } from '@app/classes/map';
import { CommunicationService } from '@app/services/communication/communication.service';
import { MapEditorService } from '@app/services/map-editer/map-editer.service';
import { SaveGameService } from '@app/services/save-game/save-game.service';
import { CONSTANTS } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { ModeEnum } from '@common/mode-enum';
import { TileEnum } from '@common/tile-enum';
import { of } from 'rxjs';

describe('mapEditerService', () => {
    let service: MapEditorService;
    let mockCommunicationService: jasmine.SpyObj<CommunicationService>;
    let mockSaveGameService: jasmine.SpyObj<SaveGameService>;

    beforeEach(() => {
        mockCommunicationService = jasmine.createSpyObj<CommunicationService>('CommunicationService', ['gameGet']);
        mockSaveGameService = jasmine.createSpyObj<SaveGameService>('SaveGameService', ['addInfo', 'createGame']);

        TestBed.configureTestingModule({
            providers: [
                { provide: CommunicationService, useValue: mockCommunicationService },
                { provide: SaveGameService, useValue: mockSaveGameService },
            ],
        });
        service = TestBed.inject(MapEditorService);
    });

    it('should be created', () => {
        expect(service).toBeDefined();
    });

    it('createGame should create a new base Map of correct size and Mode and pass it on to the subject', () => {
        const size = 10;
        const mode = ModeEnum.CTF;

        service.createGame(size, mode);

        service.mapState$.subscribe((map) => {
            expect(map?._size).toEqual(size);
            expect(map?.mode).toEqual(mode);
        });

        expect(service.gameDescription).toEqual('');
        expect(service.gameName).toEqual('');
    });

    it('selectGame should get the game from commService and update the mapState$', async () => {
        const size = 10;
        const mode: ModeEnum = ModeEnum.CTF;
        const desc = 'game desc';
        const title = 'game';
        const mockGame: Game = { title, description: desc, map: new ClientMap(size, mode) } as unknown as Game;
        mockCommunicationService.gameGet.and.returnValue(of(mockGame));

        await service.setCurrentGame('');

        service.mapState$.subscribe((map) => {
            expect(map).toBeDefined();
            expect(map?._size).toEqual(size);
            expect(map?.mode).toEqual(mode);
        });

        expect(service.gameInit).toBe(mockGame);
        expect(service.gameName).toEqual(title);
        expect(service.gameDescription).toEqual(desc);
    });

    it('remove item should remove the item from specified tile at x, y', async () => {
        const map: ClientMap = new ClientMap(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);
        const x = 1;
        const y = 1;
        const item: ClientItem = map._items[1];
        item.isOnGrid = true;
        map._tiles[y][x].item = item;

        const mockGame: Game = { title: '', description: '', map } as unknown as Game;
        mockCommunicationService.gameGet.and.returnValue(of(mockGame));

        await service.setCurrentGame('');

        service.removeItem(x, y);

        service.mapState$.subscribe((updatedMap) => {
            expect(updatedMap?._tiles[y][x].item).not.toBeDefined();
            expect(updatedMap?._items[item.id - 1].isOnGrid).toBe(false);
        });
    });

    it('addItem should add an item to the specified x y tile', () => {
        service.createGame(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.BR);

        const x = 1;
        const y = 1;
        const itemId = 1;

        service.addItem(x, y, itemId);

        service.mapState$.subscribe((map) => {
            expect(map?._tiles[y][x].item).toBe(map?._items[itemId - 1]);
            expect(map?._items[itemId - 1].isOnGrid).toBe(true);
        });
    });

    it('addItem should do nothing if tile has an item or is not terrain', () => {
        service.createGame(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.BR);

        const x = 1;
        const y = 1;
        const itemId = 1;
        if (service['_map']) {
            service['_map']._tiles[y][x].terrain = false;

            service.addItem(x, y, itemId);

            expect(service['_map']._tiles[y][x].item).not.toBeDefined();

            service['_map']._tiles[y][x].terrain = true;

            const itemIndex = itemId - 1;
            if (itemIndex >= 0 && itemIndex < service['_map']._items.length) {
                service['_map']._tiles[y][x].item = service['_map']._items[itemIndex];

                service.addItem(x, y, itemId);

                expect(service['_map']._tiles[y][x].item).toBeDefined();
            }
        }
    });

    it('addItem should remove item from another tile if added on a previous tile', () => {
        service.createGame(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.BR);

        const x1 = 1;
        const y1 = 1;
        const x2 = 2;
        const y2 = 2;
        const itemId = 0;

        service.addItem(x1, y1, itemId);

        service.addItem(y2, x2, itemId);

        service.mapState$.subscribe((map) => {
            expect(map?._tiles[y1][x1].item).not.toBeDefined();
            expect(map?._tiles[y2][x2].item).toBe(map?._items[itemId - 1]);
        });
    });

    it('addItem should do nothing if itemId is the same', () => {
        service.createGame(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.BR);

        const x = 1;
        const y = 1;
        const itemId = 0;

        service.addItem(x, y, itemId);
        service.addItem(x, y, itemId);

        service.mapState$.subscribe((map) => {
            expect(map?._tiles[y][x].item).not.toBeDefined();
        });
    });

    it('setSelectedTile should change the selected tile', () => {
        service.setSelectedTile(TileEnum.Ice);
        expect(service.getSelectedTile()).toBe(TileEnum.Ice);
    });

    it('setTileToSelected should set to the currently selected tile', () => {
        service['_selectedTile'] = TileEnum.ClosedDoor;

        service.createGame(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);

        const x = 0;
        const y = 0;

        service.setTileToSelected(x, y);

        service.mapState$.subscribe((map) => {
            expect(map?._tiles[y][x]._tileType).toBe(TileEnum.ClosedDoor);
        });
    });

    it('setTileToSelected should remove any items while reassigning', () => {
        service['_selectedTile'] = TileEnum.ClosedDoor;

        service.createGame(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);

        const x = 0;
        const y = 0;
        const itemId = 1;
        if (service['_map']) {
            service['_map']._tiles[y][x].item = service['_map']._items[itemId - 1];
            service['_map']._items[itemId - 1].isOnGrid = true;
        }
        service.setTileToSelected(x, y);

        service.mapState$.subscribe((map) => {
            expect(map?._tiles[y][x]._tileType).toBe(TileEnum.ClosedDoor);
            expect(map?._items[itemId - 1].isOnGrid).toBe(false);
            expect(map?._tiles[y][x].item).not.toBeDefined();
        });
    });

    it('setTileToSelected should set tile to openDoor if assigning closedDoor to closedDoor', () => {
        service['_selectedTile'] = TileEnum.ClosedDoor;

        service.createGame(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);

        const x = 0;
        const y = 0;

        service.setTileToSelected(x, y);
        service.setTileToSelected(x, y);

        service.mapState$.subscribe((map) => {
            expect(map?._tiles[y][x]._tileType).toBe(TileEnum.OpenDoor);
        });
    });

    it('setTileToSelected should do nothing if selected tile undefined', () => {
        service.createGame(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);

        const x = 0;
        const y = 0;

        service.setTileToSelected(x, y);

        service.mapState$.subscribe((map) => {
            expect(map?._tiles[y][x]._tileType).toBe(TileEnum.Grass);
        });
    });

    it('resetTile should set tile to grass and remove any items', () => {
        service.createGame(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);
        const x = 0;
        const y = 0;
        if (service['_map']) {
            service['_map']._tiles[y][x]._tileType = TileEnum.Water;
            service['_map']._tiles[y][x].item = service['_map']._items[0];

            service.resetTile(x, y);

            expect(service['_map']._tiles[y][x]._tileType).toBe(TileEnum.Grass);
            expect(service['_map']._tiles[y][x].item).not.toBeDefined();
        }
    });

    it('setSelectedTile should set the selected tile if not the same as param', () => {
        service.setSelectedTile(TileEnum.ClosedDoor);
        expect(service.getSelectedTile()).toBe(TileEnum.ClosedDoor);
    });

    it('setSelectedTile should set the selected tile to undefined if current same as param', () => {
        service.setSelectedTile(TileEnum.ClosedDoor);
        expect(service.getSelectedTile()).toBe(TileEnum.ClosedDoor);
        service.setSelectedTile(TileEnum.ClosedDoor);
        expect(service.getSelectedTile()).not.toBeDefined();
    });

    it('submit should call saveGameService addInfo and createGame with correct info', () => {
        service.gameDescription = 'hello';
        service.gameName = 'Hillo';

        service.submit();

        expect(mockSaveGameService.addInfo).toHaveBeenCalledWith(service['_map'], service.gameName, service.gameDescription);
        expect(mockSaveGameService.createGame).toHaveBeenCalled();
    });

    it('submit should emit an error message if description and title are empty', () => {
        spyOn(service.errorMessage$, 'next');

        service.submit();

        expect(service.errorMessage$.next).toHaveBeenCalledWith(jasmine.stringMatching(/Remplissez les champs de texte - ID: \d+/));
    });

    it('resetMap should reset the map to a new map if created', () => {
        const x = 0;
        const y = 0;

        service.createGame(CONSTANTS.SMALL_MAP_SIZE, ModeEnum.CTF);
        service.setSelectedTile(TileEnum.Water);
        service.setTileToSelected(x, y);
        service.resetMap();

        service.mapState$.subscribe((map) => {
            expect(map?._tiles[y][x]._tileType).toBe(TileEnum.Grass);
        });
    });

    it('reset map should reset the map to a clone of itself if gotten from comm', async () => {
        const size = 10;
        const mode: ModeEnum = ModeEnum.CTF;
        const desc = 'game desc';
        const title = 'game';
        const mockGame: Game = { title, description: desc, map: new ClientMap(size, mode) } as unknown as Game;
        mockCommunicationService.gameGet.and.returnValue(of(mockGame));

        await service.setCurrentGame('');

        const x = 0;
        const y = 0;
        service.setSelectedTile(TileEnum.Water);
        service.setTileToSelected(x, y);
        service.resetMap();

        service.mapState$.subscribe((map) => {
            expect(map?._tiles[y][x]._tileType).toBe(TileEnum.Grass);
        });
    });

    it('reinitialise should reset the service to an inital state', async () => {
        const size = 10;
        const mode: ModeEnum = ModeEnum.CTF;
        const desc = 'game desc';
        const title = 'game';
        const mockGame: Game = { title, description: desc, map: new ClientMap(size, mode) } as unknown as Game;
        mockCommunicationService.gameGet.and.returnValue(of(mockGame));

        await service.setCurrentGame('');

        service.reinitialise();

        expect(service.gameDescription).toBe('');
        expect(service.gameName).toBe('');
        expect(service['_map']).not.toBe(mockGame.map);
    });

    it('should return map', () => {
        const size = 10;
        const mode: ModeEnum = ModeEnum.CTF;

        const mockMap = new ClientMap(size, mode);
        service.createGame(size, mode);

        const result: ClientMap | null = service.getSelectedGame();
        expect(result).toEqual(mockMap);
    });
});
