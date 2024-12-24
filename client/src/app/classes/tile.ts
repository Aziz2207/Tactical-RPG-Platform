import { Player } from '@common/interfaces/player';
import { Tile, tileProperties } from '@common/interfaces/tile';
import { TileEnum } from '@common/tile-enum';
import { ClientItem } from './item';

export class ClientTile implements Tile {
    _tileType: TileEnum;
    item?: ClientItem;
    traversable: boolean;
    imageSrc: string;
    terrain: boolean;
    player?: Player;

    constructor(tileType: TileEnum = TileEnum.Grass, item?: ClientItem, player?: Player) {
        this._tileType = tileType;
        this.item = item;
        this.traversable = tileProperties[this._tileType].traversable;
        this.imageSrc = tileProperties[this._tileType].imageSrc;
        this.terrain = tileProperties[this._tileType].terrain;
        this.item = item;
        this.player = player;
    }
}
