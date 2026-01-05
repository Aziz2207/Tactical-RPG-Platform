import { ITEM_COUNT, NO_OBJECT } from '@app/constants';
import { GameObject } from '@app/interfaces/game-object';
import { ObjectType } from '@common/constants';

export const mockObjects: GameObject[] = [
    { id: ObjectType.Trident, name: 'mock1', description: 'mock game object one count', count: ITEM_COUNT, image: 'mock1/image.png' },
    { id: ObjectType.Armor, name: 'mock2', description: 'mock game object no count', count: NO_OBJECT, image: 'mock2/image.png' },
    { id: ObjectType.Spawn, name: 'mock3', description: 'mock spwan', count: ITEM_COUNT, image: 'mock3/image.png' },
    { id: ObjectType.Flag, name: 'mock4', description: 'mock flag', count: ITEM_COUNT, image: 'mock4/image.png' },
];
