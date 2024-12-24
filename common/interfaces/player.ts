import { Attributes } from '@common/interfaces/attributes';
import { Item } from '@common/interfaces/item';
import { Position } from '@common/interfaces/position';
export interface Player {
    userName: string;
    attributes: Attributes;
    characterType: string;
    isHost: boolean;
    socketId: string;
    position?: Position;
    nbWins: number;
    startPosition?: Position;
    hasActed?: boolean;
    isVirtual?: boolean;
    isAgressive?: boolean;
    inventory: Item[];
    hasFlag: boolean;
}
