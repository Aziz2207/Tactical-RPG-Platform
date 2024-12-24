import { CONSTANTS } from '@common/constants';
import { DiceChoice } from '@common/interfaces/attributes';
import { Attributes } from './Attributes';

describe('Attributes', () => {
    let attributes: Attributes;

    beforeEach(() => {
        attributes = new Attributes();
    });

    it('should create', () => {
        expect(attributes).toBeTruthy();
    });

    it('should initialize correctly', () => {
        expect(attributes.defensePoints).toBe(CONSTANTS.VALUE_ATTRIBUTES);
        expect(attributes.diceChosen).toBe('attack');
        expect(attributes.lifePoints).toBe(CONSTANTS.VALUE_ATTRIBUTES);
        expect(attributes.offensePoints).toBe(CONSTANTS.VALUE_ATTRIBUTES);
        expect(attributes.speedPoints).toBe(CONSTANTS.VALUE_ATTRIBUTES);
    });

    it('should create an instance with values', () => {
        const customValues: Partial<Attributes> = {
            speedPoints: CONSTANTS.VALUE_ATTRIBUTES,
            lifePoints: CONSTANTS.VALUE_ATTRIBUTES,
            offensePoints: CONSTANTS.VALUE_ATTRIBUTES,
            defensePoints: CONSTANTS.VALUE_ATTRIBUTES,
            diceChosen: 'attack' as DiceChoice,
        };

        attributes = new Attributes(customValues);

        expect(attributes.speedPoints).toBe(CONSTANTS.VALUE_ATTRIBUTES);
        expect(attributes.lifePoints).toBe(CONSTANTS.VALUE_ATTRIBUTES);
        expect(attributes.offensePoints).toBe(CONSTANTS.VALUE_ATTRIBUTES);
        expect(attributes.defensePoints).toBe(CONSTANTS.VALUE_ATTRIBUTES);
        expect(attributes.diceChosen).toBe('attack');
    });
});
