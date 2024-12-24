import { TileEnum } from '../tile-enum';
import { Item } from './item';
import { Player } from './player';

export interface Tile {
    _tileType: TileEnum;
    item?: Item;
    traversable: boolean;
    imageSrc: string;
    terrain: boolean;
    player?: Player;
}

export const tileProperties = {
    [TileEnum.Grass]: { traversable: true, imageSrc: 'assets/grass.jpeg', terrain: true, weight: 1 },
    [TileEnum.Water]: { traversable: false, imageSrc: 'assets/water.jpeg', terrain: true, weight: 2 },
    [TileEnum.Ice]: { traversable: true, imageSrc: 'assets/ice.jpeg', terrain: true, weight: 0 },
    [TileEnum.OpenDoor]: { traversable: true, imageSrc: 'assets/opendoor.png', terrain: false, weight: 1 },
    [TileEnum.ClosedDoor]: { traversable: true, imageSrc: 'assets/door.jpeg', terrain: false, weight: undefined },
    [TileEnum.Rock]: { traversable: false, imageSrc: 'assets/rock.jpeg', terrain: false, weight: undefined },
};
