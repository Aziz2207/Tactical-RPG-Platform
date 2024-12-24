import { Injectable } from '@angular/core';
import { ClientItem } from '@app/classes/item';
import { ClientMap } from '@app/classes/map';
import { ClientTile } from '@app/classes/tile';
import { CommunicationService } from '@app/services/communication/communication.service';
import { SaveGameService } from '@app/services/save-game/save-game.service';
import { CONSTANTS } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { SizeEnum } from '@common/interfaces/map';
import { ModeEnum } from '@common/mode-enum';
import { TileEnum } from '@common/tile-enum';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class MapEditorService {
    errorMessage$: Subject<string> = new Subject<string>();
    readonly baseTile: TileEnum = TileEnum.Grass;

    isLeftDragging: boolean = false;
    isRightDragging: boolean = false;

    gameDescription: string | undefined;
    gameName: string | undefined;

    gameInit: Game | undefined;
    mapState$: Observable<ClientMap | null>;

    maxItemCount: number;
    gridItemCount: number = 0;

    private _selectedTile: TileEnum | undefined;
    private _map: ClientMap | null = null;
    private _mapSubject: BehaviorSubject<ClientMap | null> = new BehaviorSubject<ClientMap | null>(null);

    constructor(
        private saveGameService: SaveGameService,
        private communicationService: CommunicationService,
    ) {
        this.mapState$ = this._mapSubject.asObservable();
    }

    createGame(size: number, mode: ModeEnum) {
        this._map = new ClientMap(size, mode);
        this._mapSubject.next(this._map);
        this.gameName = '';
        this.gameDescription = '';
        if (this._map._size === CONSTANTS.SMALL_MAP_SIZE) {
            this.maxItemCount = CONSTANTS.ITEM_COUNT_10;
        } else if (this._map._size === CONSTANTS.MEDIUM_MAP_SIZE) {
            this.maxItemCount = CONSTANTS.ITEM_COUNT_15;
        } else if (this._map._size === CONSTANTS.LARGE_MAP_SIZE) {
            this.maxItemCount = CONSTANTS.ITEM_COUNT_20;
        }
        this.gridItemCount = 0;
    }

    async setCurrentGame(id: string) {
        this.communicationService.gameGet(id).subscribe((game: Game) => {
            this.gameInit = game;
            this.gameDescription = game.description;
            this.gameName = game.title;
            this._map = this.cloneMap(game);
            this._mapSubject.next(game.map);
        });
    }

    removeItem(x: number, y: number) {
        if (this._map) {
            if (this._map?._items && this._map._tiles) {
                const item = this._map._tiles[y][x].item;
                if (item) {
                    this._map._tiles[y][x].item = undefined;
                    this._map._items[item.id - 1].isOnGrid = false;
                    if (this.gridItemCount > 0 && (item.hasEffect || item.itemType === 'mystery')) {
                        this.gridItemCount -= 1;
                    }
                }
            }
            this._mapSubject.next(this._map);
        }
    }

    addItem(x: number, y: number, itemId: number) {
        if (this._map?._tiles[y][x].item) return;
        if (!this._map?._tiles[y][x].terrain) return;

        const item = this._map._items[itemId - 1];

        if (this.gridItemCount >= this.maxItemCount && (item.hasEffect || item.itemType === 'mystery')) {
            this.errorMessage$.next('Vous pouvez placer ' + this.maxItemCount + ' items au maximum');
            return;
        }

        if (!item) return;

        if (item.isOnGrid) {
            this._map._tiles.forEach((row) => {
                row.forEach((tile) => {
                    if (tile.item && tile.item.id === itemId) {
                        tile.item = undefined;
                    }
                });
            });
        }

        item.isOnGrid = true;
        this._map._tiles[y][x].item = item;

        this._mapSubject.next(this._map);
        this._selectedTile = undefined;
        if (item.hasEffect || item.itemType === 'mystery') {
            this.gridItemCount = this.gridItemCount + 1;
        }
    }

    setTileToSelected(x: number, y: number) {
        if (!this._selectedTile) return;
        this.setTile(x, y, this._selectedTile);
    }

    resetTile(x: number, y: number) {
        this.setTile(x, y, this.baseTile);
    }

    getSelectedTile() {
        return this._selectedTile;
    }

    setSelectedTile(tile: TileEnum) {
        this._selectedTile = this._selectedTile === tile ? undefined : tile;
    }

    submit(): void {
        if (this.gameName?.trim() && this.gameDescription?.trim()) {
            this.saveGameService.addInfo(this._map, this.gameName.trim(), this.gameDescription.trim());
            this.saveGameService.createGame();
        } else {
            const errorId = new Date().getTime();
            this.errorMessage$.next(`Remplissez les champs de texte - ID: ${errorId}`);
        }
    }

    resetMap(): void {
        if (this._map) {
            if (this.gameInit) {
                this._map = this.cloneMap(this.gameInit);
                this._mapSubject.next(this._map);
                this.gameDescription = this.gameInit.description;
                this.gameName = this.gameInit.title;
            } else {
                this.createGame(this._map._size, this._map.mode);
            }
        }
    }

    getSelectedGame(): ClientMap | null {
        return this._map;
    }

    reinitialise(): void {
        this.gameInit = undefined;
        this._selectedTile = undefined;
        this.createGame(SizeEnum.x10, ModeEnum.BR);
        this.isLeftDragging = false;
        this.isRightDragging = false;
    }

    cloneMap(game: Game) {
        // Recreate each item

        const items: ClientItem[] = game.map._items.map((item) => {
            return new ClientItem(item.itemType, item.id, item.isOnGrid);
        });
        // Recreate each tile

        const tiles: ClientTile[][] = game.map._tiles.map((row: ClientTile[]) => {
            return row.map((tile: ClientTile) => {
                let newItem: ClientItem | undefined;
                if (tile.item) {
                    newItem = items?.find((item) => item.id === tile.item?.id);
                }
                const newTile = new ClientTile(tile._tileType, newItem);
                return newTile;
            });
        });

        const map = new ClientMap(game.map._size, game.map.mode, tiles, items);

        return map;
    }

    private setTile(x: number, y: number, tile: TileEnum) {
        if (this._map) {
            if (this._map._tiles[y][x]._tileType === TileEnum.ClosedDoor && tile === TileEnum.ClosedDoor) {
                this.removeItem(x, y);
                this._map._tiles[y][x] = new ClientTile(TileEnum.OpenDoor);
            } else if (this._map && this._map._tiles[y][x]._tileType !== tile) {
                this.removeItem(x, y);
                this._map._tiles[y][x] = new ClientTile(tile);
            }
            this._mapSubject.next(this._map);
        }
    }
}
