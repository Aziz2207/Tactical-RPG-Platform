// import { CONSTANTS } from '@common/constants';
// import { ItemEnum } from '@common/item-enum';
// import { ModeEnum } from '@common/mode-enum';
// import { ClientItem } from './item';
// import { ClientMap } from './map';
// import { ClientTile } from './tile';

// describe('Map', () => {
//     it('should create an instance', () => {
//         const items = [new ClientItem(ItemEnum.ABomb, 1), new ClientItem(ItemEnum.Chip, 2)];
//         const map = new ClientMap(CONSTANTS.SIZE_10, ModeEnum.CTF, undefined, items);
//         expect(map).toBeTruthy();
//     });

//     it('should have the correct attributes', () => {
//         const items = [new ClientItem(ItemEnum.ABomb, 1), new ClientItem(ItemEnum.Chip, 2)];
//         const tiles: ClientTile[][] = [[]];
//         const map = new ClientMap(CONSTANTS.SIZE_10, ModeEnum.CTF, tiles, items);
//         expect(map).toBeTruthy();
//     });

//     it('should create an instance if given tiles', () => {
//         const tiles: ClientTile[][] = [[]];
//         const map = new ClientMap(CONSTANTS.SIZE_10, ModeEnum.CTF, tiles);
//         expect(map).toBeTruthy();
//     });

//     it('should have the correct attributes', () => {
//         const map = new ClientMap(CONSTANTS.SIZE_10, ModeEnum.CTF);
//         expect(map._size).toBe(CONSTANTS.SIZE_10);
//         expect(map.mode).toBe(ModeEnum.CTF);
//         expect(map._tiles.length).toBe(CONSTANTS.SIZE_10);
//         expect(map._tiles[0].length).toBe(CONSTANTS.SIZE_10);

//         const startPoints = map._items.filter((item) => item.itemType === ItemEnum.StartPoint);
//         expect(startPoints.length).toBe(CONSTANTS.ITEM_COUNT_10);

//         const randomItems = map._items.filter((item) => item.isRandom);
//         expect(randomItems.length - 1).toBe(CONSTANTS.ITEM_COUNT_20);

//         const flag = map._items.find((item) => item.itemType === ItemEnum.Flag);
//         expect(flag).toBeTruthy();
//     });

//     it('should create tiles when not provided', () => {
//         const map = new ClientMap(CONSTANTS.SIZE_10, ModeEnum.BR);
//         expect(map._tiles.length).toBe(CONSTANTS.SIZE_10);
//         expect(map._tiles[0].length).toBe(CONSTANTS.SIZE_10);
//         for (let i = 0; i < map._size; i++) {
//             for (let j = 0; j < map._size; j++) {
//                 expect(map._tiles[i][j]).toBeInstanceOf(ClientTile);
//             }
//         }
//     });

//     it('should create correct number of items based on size', () => {
//         const map10 = new ClientMap(CONSTANTS.SIZE_10, ModeEnum.BR);
//         expect(map10._items.length).toBe(CONSTANTS.TOTAL_ITEM_COUNT_10);

//         const map15 = new ClientMap(CONSTANTS.SIZE_15, ModeEnum.BR);
//         expect(map15._items.length).toBe(CONSTANTS.SIZE_11);

//         const map20 = new ClientMap(CONSTANTS.SIZE_20, ModeEnum.BR);
//         expect(map20._items.length - 1).toBe(CONSTANTS.ITEM_COUNT_20 * 2);
//     });

//     it('should create start points and random items', () => {
//         const map = new ClientMap(CONSTANTS.SIZE_10, ModeEnum.BR);
//         const startPoints = map._items.filter((item) => item.itemType === ItemEnum.StartPoint);
//         const otherItems = map._items.filter((item) => item.itemType !== ItemEnum.StartPoint);

//         expect(startPoints.length).toBe(CONSTANTS.ITEM_COUNT_10);
//         expect(otherItems.length - 1).toBe(CONSTANTS.ITEM_COUNT_20);
//     });

//     it('should add a flag in CTF mode', () => {
//         const map = new ClientMap(CONSTANTS.SIZE_10, ModeEnum.CTF);
//         const flag = map._items.find((item) => item.itemType === ItemEnum.Flag);
//         expect(flag).toBeTruthy();
//         expect(map._items.length).toBe(CONSTANTS.SIZE_11);
//     });

//     it('should set tiles and items when provided in the constructor', () => {
//         const tiles = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => new ClientTile()));
//         const items = [new ClientItem(ItemEnum.ABomb, 1), new ClientItem(ItemEnum.Chip, 2)];
//         const map = new ClientMap(CONSTANTS.SIZE_5, ModeEnum.CTF, tiles, items);

//         expect(map._size).toBe(CONSTANTS.SIZE_5);
//         expect(map.mode).toBe(ModeEnum.CTF);
//         expect(map._tiles).toBe(tiles);
//         expect(map._items).toBe(items);
//     });
// });
