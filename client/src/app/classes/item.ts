import { Item, itemProperties } from '@common/interfaces/item';
import { ItemEnum } from '@common/item-enum';

export class ClientItem implements Item {
    itemType: ItemEnum;
    imgSrc: string;
    isRandom: boolean;
    id: number;
    isOnGrid: boolean;
    description: string;
    hasEffect: boolean;

    constructor(itemType: ItemEnum, id: number, isOnGrid: boolean = false) {
        this.itemType = itemType;
        this.imgSrc = itemProperties[this.itemType].imgSrc;
        this.isRandom = itemProperties[this.itemType].isRandom;
        this.id = id;
        this.isOnGrid = isOnGrid;
        this.description = itemProperties[this.itemType].description;
        this.hasEffect = itemProperties[this.itemType].hasEffect;
    }
}
