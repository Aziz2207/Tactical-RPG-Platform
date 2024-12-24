import { CONSTANTS } from '@common/constants';
import { DiceChoice } from '@common/interfaces/attributes';

export class Attributes {
    speedPoints: number = CONSTANTS.VALUE_ATTRIBUTES;
    lifePoints: number = CONSTANTS.VALUE_ATTRIBUTES;
    offensePoints: number = CONSTANTS.VALUE_ATTRIBUTES;
    defensePoints: number = CONSTANTS.VALUE_ATTRIBUTES;
    diceChosen: DiceChoice = 'attack';
    constructor(init?: Partial<Attributes>) {
        Object.assign(this, init);
    }
}
