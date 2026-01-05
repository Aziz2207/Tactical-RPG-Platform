import { GameObject } from './game-object';

export interface ItemSwap {
    currentItem1: GameObject;
    currentItem2: GameObject;
    pickedUpItem: GameObject;
}