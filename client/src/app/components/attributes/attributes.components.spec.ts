import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttributesComponent } from '@app/components/attributes/attributes.components';
import { CONSTANTS } from '@common/constants';

describe('AttributesComponent', () => {
    let component: AttributesComponent;
    let fixture: ComponentFixture<AttributesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AttributesComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(AttributesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize attributes', () => {
        expect(component.attributes).toBeDefined();
        expect(component.attributes.speedPoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES);
        expect(component.attributes.lifePoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES);
        expect(component.attributes.offensePoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES_DICE);
        expect(component.attributes.defensePoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES_DICE);
    });

    it('should add bonus to speed', () => {
        component.addBonus(true, false);
        expect(component.attributes.speedPoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX);
        expect(component.bonusApplied).toBeTrue();
        expect(component.validateAttributes).toBeFalse();
    });

    it('should add bonus to life', () => {
        component.addBonus(false, true);
        expect(component.attributes.lifePoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX);
        expect(component.bonusApplied).toBeTrue();
        expect(component.validateAttributes).toBeFalse();
    });

    it('should not apply bonus if already applied', () => {
        component.bonusApplied = true;
        component.addBonus(true, false);
        expect(component.attributes.speedPoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES);
    });

    it('should transfer bonus from life to speed when bonus already applied and lifePoints at max', () => {
        component.bonusApplied = true;
        component.attributes.lifePoints = CONSTANTS.VALUE_ATTRIBUTES_MAX;
        component.attributes.currentHP = CONSTANTS.VALUE_ATTRIBUTES_MAX;
        component.attributes.speedPoints = CONSTANTS.VALUE_ATTRIBUTES;
        component.attributes.currentSpeed = CONSTANTS.VALUE_ATTRIBUTES;
        component.addBonus(true, false);

        expect(component.attributes.lifePoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX - 2);
        expect(component.attributes.currentHP).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX - 2);
        expect(component.attributes.speedPoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES + 2);
        expect(component.attributes.currentSpeed).toEqual(CONSTANTS.VALUE_ATTRIBUTES + 2);
    });

    it('should transfer bonus from speed to life when bonus already applied and speedPoints at max', () => {
        component.bonusApplied = true;
        component.attributes.speedPoints = CONSTANTS.VALUE_ATTRIBUTES_MAX;
        component.attributes.currentSpeed = CONSTANTS.VALUE_ATTRIBUTES_MAX;
        component.attributes.lifePoints = CONSTANTS.VALUE_ATTRIBUTES;
        component.attributes.currentHP = CONSTANTS.VALUE_ATTRIBUTES;
        component.addBonus(false, true);

        expect(component.attributes.speedPoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX - 2);
        expect(component.attributes.currentSpeed).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX - 2);
        expect(component.attributes.lifePoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES + 2);
        expect(component.attributes.currentHP).toEqual(CONSTANTS.VALUE_ATTRIBUTES + 2);
    });

    it('should give sixD to attack if giveSixDToAttack', () => {
        component.giveSixDToAttack();
        expect(component.attributes.diceChoice).toEqual('attack');
        expect(component.diceChosen).toBeTrue();
        expect(component.validateAttributes).toBeFalse();
    });

    it('should change diceChoice to attack when previously defense', () => {
        component.diceChosen = true;
        component.attributes.diceChoice = 'defense';
        component.giveSixDToAttack();
        expect(component.attributes.diceChoice).toEqual('attack');
        expect(component.diceChosen).toBeTrue();
    });

    it('should give sixD to defense if giveSixDtoDefense', () => {
        component.giveSixDtoDefense();
        expect(component.attributes.diceChoice).toEqual('defense');
        expect(component.diceChosen).toBeTrue();
        expect(component.validateAttributes).toBeFalse();
    });

    it('should change diceChoice to defense when previously attack', () => {
        component.diceChosen = true;
        component.attributes.diceChoice = 'attack';
        component.giveSixDtoDefense();
        expect(component.attributes.diceChoice).toEqual('defense');
        expect(component.diceChosen).toBeTrue();
    });

    it('should define canJoin as true if bonusApplied and diceChosen', () => {
        component.bonusApplied = true;
        component.diceChosen = true;
        component.updateCanJoin();
        expect(component.validateAttributes).toBeTrue();
    });

    it('should not validate attributes when bonusApplied and diceChosen are false', () => {
        component.bonusApplied = false;
        component.diceChosen = false;
        component.updateCanJoin();
        expect(component.validateAttributes).toBeFalse();
    });

    it('should emit canJoinGame when updateCanJoin', () => {
        spyOn(component.validAttributs, 'emit');
        component.bonusApplied = true;
        component.diceChosen = true;
        component.updateCanJoin();
        expect(component.validAttributs.emit).toHaveBeenCalledWith(true);
    });

    it('should bonus to life when bonusApplied and speedPoints are max', () => {
        component.attributes.lifePoints = CONSTANTS.VALUE_ATTRIBUTES_MAX;
        component.bonusApplied = true;
        component.addBonus(true, false);
        expect(component.attributes.speedPoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX);
        expect(component.attributes.currentSpeed).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX);
        expect(component.attributes.lifePoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX - CONSTANTS.VALUE_ATTRIBUES_TWO);
        expect(component.attributes.currentHP).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX - CONSTANTS.VALUE_ATTRIBUTES);
    });

    it('should adjust attributes', () => {
        component.attributes.speedPoints = CONSTANTS.VALUE_ATTRIBUTES_MAX;
        component.bonusApplied = true;
        component.addBonus(false, true);
        expect(component.attributes.speedPoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX - CONSTANTS.VALUE_ATTRIBUES_TWO);
        expect(component.attributes.currentSpeed).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX - CONSTANTS.VALUE_ATTRIBUTES);
        expect(component.attributes.lifePoints).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX);
        expect(component.attributes.currentHP).toEqual(CONSTANTS.VALUE_ATTRIBUTES_MAX);
    });
});
