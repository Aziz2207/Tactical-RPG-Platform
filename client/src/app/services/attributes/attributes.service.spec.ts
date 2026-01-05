import { TestBed } from '@angular/core/testing';
import { DEFAULT_ATTRIBUTE, DICE_4, DICE_6, ErrorMessages, HIGH_ATTRIBUTE } from '@app/constants';
import { AttributesService } from './attributes.service';

/* eslint-disable @typescript-eslint/no-explicit-any */
// To spyOn private method of the service
describe('AttributesService', () => {
    let service: AttributesService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(AttributesService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set character name to ABC when setName is called with ABC', () => {
        service.setCharacterName('ABC');
        expect(service.name).toEqual('ABC');
    });

    it('should set the first attribute to HIGH_ATTRIBUTE and the second to DEFAULT_ATTRIBUTE', () => {
        service['setAttribute']('totalHp', 'speed');

        expect(service.attributes.totalHp).toBe(HIGH_ATTRIBUTE);
        expect(service.attributes.speed).toBe(DEFAULT_ATTRIBUTE);
    });

    describe('setAttribute', () => {
        beforeEach(() => {
            spyOn<any>(service, 'setAttribute');
        });

        it('should call setAttribute with "totalHp" and "speed"', () => {
            service.setHealth();
            expect(service['setAttribute']).toHaveBeenCalledWith('totalHp', 'speed');
        });

        it('should call setAttribute with "speed" and "totalHp"', () => {
            service.setSpeed();
            expect(service['setAttribute']).toHaveBeenCalledWith('speed', 'totalHp');
        });

        it('should call setAttribute with defDiceMax and atkDiceMax when attack4 is passed', () => {
            service.setAttack('attack4');
            expect(service['setAttribute']).toHaveBeenCalledWith('defDiceMax', 'atkDiceMax');
        });

        it('should call setAttribute with atkDiceMax and defDiceMax when attack6 is passed', () => {
            service.setAttack('attack6');
            expect(service['setAttribute']).toHaveBeenCalledWith('atkDiceMax', 'defDiceMax');
        });

        it('should call setAttribute with atkDiceMax and defDiceMax when defense4 is passed', () => {
            service.setDefense('defense4');
            expect(service['setAttribute']).toHaveBeenCalledWith('atkDiceMax', 'defDiceMax');
        });

        it('should call setAttribute with defDiceMax and atkDiceMax when defense6 is passed', () => {
            service.setDefense('defense6');
            expect(service['setAttribute']).toHaveBeenCalledWith('defDiceMax', 'atkDiceMax');
        });
    });

    it('should return true if character name is valid', () => {
        service.name = 'ABC';
        expect(service['hasName']()).toBeTruthy();
    });

    it('should return false if character name is not given', () => {
        expect(service['hasName']()).toBeFalsy();
    });

    describe('hasSelectedAttributes', () => {
        it('should return true when totalHp is not DEFAULT_ATTRIBUTE and hasSelectedDice returns true', () => {
            service.attributes.totalHp = HIGH_ATTRIBUTE;
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(true);
            const result = service['hasSelectedAttributes']();
            expect(result).toBeTrue();
        });

        it('should return true when speed is not DEFAULT_ATTRIBUTE and hasSelectedDice returns true', () => {
            service.attributes.speed = HIGH_ATTRIBUTE;
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(true);
            const result = service['hasSelectedAttributes']();
            expect(result).toBeTrue();
        });

        it('should return false when totalHp and speed are DEFAULT_ATTRIBUTE and hasSelectedDice returns true', () => {
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(true);
            const result = service['hasSelectedAttributes']();
            expect(result).toBeFalse();
        });

        it('should return false when totalHp is not DEFAULT_ATTRIBUTE and hasSelectedDice returns false', () => {
            service.attributes.totalHp = HIGH_ATTRIBUTE;
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(false);
            const result = service['hasSelectedAttributes']();
            expect(result).toBeFalse();
        });

        it('should return false when speed is not DEFAULT_ATTRIBUTE and hasSelectedDice returns false', () => {
            service.attributes.speed = HIGH_ATTRIBUTE;
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(false);
            const result = service['hasSelectedAttributes']();
            expect(result).toBeFalse();
        });
        it('should return false when totalHp and speed are DEFAULT_ATTRIBUTE and hasSelectedDice returns false', () => {
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(false);
            const result = service['hasSelectedAttributes']();
            expect(result).toBeFalse();
        });
    });

    describe('hasSelectedDice', () => {
        it('should return true when atkDiceMax is HIGH_ATTRIBUTE', () => {
            service.attributes.atkDiceMax = HIGH_ATTRIBUTE;
            const result = service['hasSelectedDice']();
            expect(result).toBeTrue();
        });

        it('should return true when defDiceMax is HIGH_ATTRIBUTE', () => {
            service.attributes.defDiceMax = HIGH_ATTRIBUTE;
            const result = service['hasSelectedDice']();
            expect(result).toBeTrue();
        });

        it('should return false when defDiceMax is DEFAULT_ATTRIBUTE', () => {
            const result = service['hasSelectedDice']();
            expect(result).toBeFalse();
        });
    });

    it('should reset all attributes to default values when resetAttributes is called ', () => {
        service.setCharacterName('test');
        service.setHealth();
        service.setAttack('attack6');
        service.resetAttributes();
        const attribute = service.attributes;
        expect(service.name).toEqual('');
        expect(attribute.totalHp).toEqual(DEFAULT_ATTRIBUTE);
        expect(attribute.speed).toEqual(DEFAULT_ATTRIBUTE);
        expect(attribute.atkDiceMax).toEqual(DEFAULT_ATTRIBUTE);
        expect(attribute.defDiceMax).toEqual(DEFAULT_ATTRIBUTE);
    });

    describe('getAttributeValue', () => {
        it('should return the dice message when chosenAttribute is atkDiceMax and hasSelectedDice() is true', () => {
            service.attributes.atkDiceMax = HIGH_ATTRIBUTE;
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(true);
            spyOn(service, 'getDiceMessage').and.returnValue(DICE_6);
            service.getAttributeValue('atkDiceMax');
            expect(service.getDiceMessage).toHaveBeenCalledWith('atkDiceMax');
        });

        it('should return the dice message when chosenAttribute is defDiceMax and hasSelectedDice() is true', () => {
            service.attributes.defDiceMax = HIGH_ATTRIBUTE;
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(true);
            spyOn(service, 'getDiceMessage').and.returnValue(DICE_6);
            service.getAttributeValue('atkDiceMax');
            expect(service.getDiceMessage).toHaveBeenCalledWith('atkDiceMax');
        });

        it('should return DEFAULT_ATTRIBUTE when chosenAttribute is defDiceMax and hasSelectedDice() is false', () => {
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(false);
            spyOn(service, 'getDiceMessage').and.returnValue(DICE_6);
            const result = service.getAttributeValue('atkDiceMax');
            expect(service.getDiceMessage).not.toHaveBeenCalled();
            expect(result).toBe(DEFAULT_ATTRIBUTE);
        });

        it('should return DEFAULT_ATTRIBUTE when chosenAttribute is totalHp and hasSelectedDice() is true', () => {
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(true);
            spyOn(service, 'getDiceMessage');
            const result = service.getAttributeValue('totalHp');
            expect(service.getDiceMessage).not.toHaveBeenCalled();
            expect(result).toBe(DEFAULT_ATTRIBUTE);
        });

        it('should return DEFAUL_ATTRIBUTE when chosenAttribute is speed and hasSelectedDice() is true', () => {
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(true);
            spyOn(service, 'getDiceMessage');
            const result = service.getAttributeValue('speed');
            expect(service.getDiceMessage).not.toHaveBeenCalled();
            expect(result).toBe(DEFAULT_ATTRIBUTE);
        });
    });

    describe('saveAttributesValue', () => {
        it('should return missingName error when no name is given', () => {
            spyOn<any>(service, 'hasName').and.returnValue('');
            const result = service.saveAttributesValue();

            expect(result).toBe(ErrorMessages.MissingName);
        });

        it('should return missingAttributes error when attributes are missing', () => {
            spyOn<any>(service, 'hasName').and.returnValue('test');
            spyOn<any>(service, 'hasSelectedAttributes').and.returnValue(false);

            const result = service.saveAttributesValue();

            expect(result).toBe(ErrorMessages.MissingAttributes);
        });

        it('should return empty string when name and attributes are defined', () => {
            spyOn<any>(service, 'hasName').and.returnValue('test');
            spyOn<any>(service, 'hasSelectedAttributes').and.returnValue(true);

            const result = service.saveAttributesValue();

            expect(result).toBe('');
        });
    });

    it('should return DICE_4 when atkDiceMax equals DEFAULT_ATTRIBUTE', () => {
        const result = service.getDiceMessage('atkDiceMax');
        expect(result).toBe(DICE_4);
    });

    it('should return DICE_6 when atkDiceMax does not equal DEFAULT_ATTRIBUTE', () => {
        service.attributes.atkDiceMax = HIGH_ATTRIBUTE;
        const result = service.getDiceMessage('atkDiceMax');
        expect(result).toBe(DICE_6);
    });

    it('should return DICE_4 when defDiceMax equals DEFAULT_ATTRIBUTE', () => {
        const result = service.getDiceMessage('defDiceMax');
        expect(result).toBe(DICE_4);
    });

    it('should return DICE_6 when defDiceMax does not equal DEFAULT_ATTRIBUTE', () => {
        service.attributes.defDiceMax = HIGH_ATTRIBUTE;
        const result = service.getDiceMessage('defDiceMax');
        expect(result).toBe(DICE_6);
    });

    describe('isButtonSelected', () => {
        it('should return true for health button when totalHp is HIGH_ATTRIBUTE', () => {
            service.attributes.totalHp = HIGH_ATTRIBUTE;
            const result = service.isButtonSelected('health');
            expect(result).toBe(true);
        });

        it('should return true for speed button when speed is HIGH_ATTRIBUTE', () => {
            service.attributes.speed = HIGH_ATTRIBUTE;
            const result = service.isButtonSelected('speed');
            expect(result).toBe(true);
        });

        it('should return true for attack4 button when atkDiceMax is DEFAULT_ATTRIBUTE and hasSelectedDice is true', () => {
            service.attributes.atkDiceMax = DEFAULT_ATTRIBUTE;
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(true);
            const result = service.isButtonSelected('attack4');
            expect(result).toBe(true);
        });

        it('should return false for attack4 button when hasSelectedDice is false', () => {
            service.attributes.atkDiceMax = DEFAULT_ATTRIBUTE;
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(false);
            const result = service.isButtonSelected('attack4');
            expect(result).toBe(false);
        });

        it('should return true for attack6 button when atkDiceMax is HIGH_ATTRIBUTE', () => {
            service.attributes.atkDiceMax = HIGH_ATTRIBUTE;
            const result = service.isButtonSelected('attack6');
            expect(result).toBe(true);
        });

        it('should return true for defense4 button when defDiceMax is DEFAULT_ATTRIBUTE and hasSelectedDice is true', () => {
            service.attributes.defDiceMax = DEFAULT_ATTRIBUTE;
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(true);
            const result = service.isButtonSelected('defense4');
            expect(result).toBe(true);
        });

        it('should return false for defense4 button when hasSelectedDice is false', () => {
            service.attributes.defDiceMax = DEFAULT_ATTRIBUTE;
            spyOn<any>(service, 'hasSelectedDice').and.returnValue(false);
            const result = service.isButtonSelected('defense4');
            expect(result).toBe(false);
        });

        it('should return true for defense6 button when defDiceMax is HIGH_ATTRIBUTE', () => {
            service.attributes.defDiceMax = HIGH_ATTRIBUTE;
            const result = service.isButtonSelected('defense6');
            expect(result).toBe(true);
        });

        it('should return undefined for unknown button name', () => {
            const result = service.isButtonSelected('unknownButton');
            expect(result).toBeUndefined();
        });
    });

    it('should set currentHp to totalHp and actionPoints, maxActionPoints, movementPointsLeft to speed', () => {
        service['setAllStats']();
        const attributes = service.getAttributes();
        expect(attributes.currentHp).toBe(attributes.totalHp);
        expect(attributes.movementPointsLeft).toBe(attributes.speed);
    });
});
