import { CONSTANTS } from '@common/constants';
import { ItemEnum } from '@common/item-enum';
import { TileEnum } from '@common/tile-enum';
import { ClientItem } from './item';
import { ClientTile } from './tile';

describe('Tile', () => {
    it('should create an instance', () => {
        expect(new ClientTile(TileEnum.Grass, new ClientItem(ItemEnum.ABomb, CONSTANTS.ID_ITEM_TEST))).toBeTruthy();
    });

    it('traversability of tiles should be consistent with game logic', () => {
        const grassTile = new ClientTile(TileEnum.Grass);
        const iceTile = new ClientTile(TileEnum.Ice);
        const waterTile = new ClientTile(TileEnum.Water);
        const openDoorTile = new ClientTile(TileEnum.OpenDoor);
        const closedDoorTile = new ClientTile(TileEnum.ClosedDoor);
        const rockTile = new ClientTile(TileEnum.Rock);
        expect(grassTile.traversable).toBeTrue();
        expect(iceTile.traversable).toBeTrue();
        expect(waterTile.traversable).toBeFalse();
        expect(openDoorTile.traversable).toBeTrue();
        expect(closedDoorTile.traversable).toBeTrue();
        expect(rockTile.traversable).toBeFalse();
    });

    it('should set the tileType', () => {
        const tile = new ClientTile(TileEnum.Grass);
        tile._tileType = TileEnum.Water;

        expect(tile._tileType).toBe(TileEnum.Water);
        expect(tile.traversable).toBe(true);
        expect(tile.imageSrc).toBe('assets/grass.jpeg');
    });
});
