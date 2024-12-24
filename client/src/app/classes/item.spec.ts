// import { itemProperties } from '@common/Interfaces/Item';
// import { ItemEnum } from '@common/item-enum';
// import { ClientItem, getRandomItem } from './item';

// describe('Item', () => {
//     let item: ClientItem;

//     beforeEach(() => {
//         item = new ClientItem(ItemEnum.ABomb, 1, true);
//     });

//     it('should create an instance', () => {
//         expect(item).toBeTruthy();
//     });

//     it('should initialize ClientItem', () => {
//         expect(item.itemType).toBe(ItemEnum.ABomb);
//         expect(item.imgSrc).toBe(itemProperties[ItemEnum.ABomb].imgSrc);
//         expect(item.isRandom).toBe(itemProperties[ItemEnum.ABomb].isRandom);
//         expect(item.id).toBe(1);
//         expect(item.isOnGrid).toBe(true); // Custom value passed in constructor
//     });

//     it('should set isOnGrid to false', () => {
//         const defaultItem = new ClientItem(ItemEnum.ABomb, 2);
//         expect(defaultItem.isOnGrid).toBe(false); // Default value
//     });

//     it('should return an ItemEnum type', () => {
//         const randomItem = getRandomItem();
//         expect(Object.values(ItemEnum)).toContain(randomItem);
//         expect(itemProperties[randomItem].isRandom).toBe(true);
//     });

//     it('should return a random item', () => {
//         const randomItem = getRandomItem();
//         expect(randomItem in ItemEnum).toBe(false);
//     });
// });
