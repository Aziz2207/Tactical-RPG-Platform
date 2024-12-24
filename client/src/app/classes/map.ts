import { CONSTANTS } from '@common/constants';
import { Item } from '@common/interfaces/item';
import { Map } from '@common/interfaces/map';
import { ItemEnum } from '@common/item-enum';
import { ModeEnum } from '@common/mode-enum';
import { ClientItem } from './item';
import { ClientTile } from './tile';

export class ClientMap implements Map {
    _size: number;
    _tiles: ClientTile[][];
    _items: Item[];
    mode: ModeEnum;

    constructor(size: number, mode: ModeEnum = ModeEnum.BR, tiles?: ClientTile[][], items?: ClientItem[]) {
        this._size = Number(size);
        this.mode = mode;

        if (tiles && items) {
            this._tiles = tiles;
            this._items = items;
            return;
        }
        this._tiles = Array.from({ length: size }, () => Array.from({ length: size }, () => new ClientTile()));
        let itemCount = 0;

        switch (this._size) {
            case CONSTANTS.SMALL_MAP_SIZE:
                itemCount = CONSTANTS.ITEM_COUNT_10;
                break;
            case CONSTANTS.MEDIUM_MAP_SIZE:
                itemCount = CONSTANTS.ITEM_COUNT_15;
                break;
            case CONSTANTS.LARGE_MAP_SIZE:
                itemCount = CONSTANTS.ITEM_COUNT_20;
                break;
        }

        let id = 1;

        this._items = [];
        // Set start points
        for (let i = 0; i < itemCount; i++) {
            this._items.push(new ClientItem(ItemEnum.StartPoint, id++));
            this._items.push(new ClientItem(ItemEnum.Mystery, id++));
        }

        Object.values(ItemEnum).forEach((item) => {
            if (item === ItemEnum.StartPoint || item === ItemEnum.Mystery) {
                return;
            }
            if (item === ItemEnum.Flag && !(mode === ModeEnum.CTF)) {
                return;
            }

            this._items.push(new ClientItem(item, id++));
        });
    }
}
