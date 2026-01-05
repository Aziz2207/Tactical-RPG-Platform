import { Injectable } from '@angular/core';
import { DEFAULT_ATTRIBUTE, DICE_4, DICE_6, ErrorMessages, HIGH_ATTRIBUTE } from '@app/constants';
import { defaultAttributes } from '@app/default-attributes';
import { Attributes } from '@common/interfaces/player';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
    providedIn: 'root',
})
export class AttributesService {
    constructor(private translate: TranslateService){}

    name: string = '';
    attributes: Attributes = { ...defaultAttributes };

    setCharacterName(name: string) {
        this.name = name;
    }

    setHealth() {
        this.setAttribute('totalHp', 'speed');
    }

    setSpeed() {
        this.setAttribute('speed', 'totalHp');
    }

    setAttack(dice: string) {
        if (dice === 'attack4') {
            this.setAttribute('defDiceMax', 'atkDiceMax');
        } else {
            this.setAttribute('atkDiceMax', 'defDiceMax');
        }
    }

    setDefense(dice: string) {
        if (dice === 'defense4') {
            this.setAttribute('atkDiceMax', 'defDiceMax');
        } else {
            this.setAttribute('defDiceMax', 'atkDiceMax');
        }
    }

    resetAttributes() {
        this.name = '';
        this.attributes = { ...defaultAttributes };
    }

    getAttributeValue(chosenAttribute: keyof Attributes) {
        if (chosenAttribute.includes('DiceMax') && this.hasSelectedDice()) {
            return this.getDiceMessage(chosenAttribute);
        }
        return this.attributes[chosenAttribute];
    }

    saveAttributesValue() {
        if (!this.hasName()) {
            return this.translate.instant(ErrorMessages.MissingName);
        }
        if (!this.hasSelectedAttributes()) {
            return this.translate.instant(ErrorMessages.MissingAttributes);
        }
        return '';
    }

    getDiceMessage(chosenAttribute: keyof Attributes) {
        const diceValue = this.attributes[chosenAttribute];
        return diceValue === DEFAULT_ATTRIBUTE ? DICE_4 : DICE_6;
    }

    isButtonSelected(buttonName: string) {
        const { totalHp, speed, atkDiceMax, defDiceMax } = this.attributes;
        const highAttributeSelected = (value: number) => value === HIGH_ATTRIBUTE;
        const defaultAttributeSelected = (value: number) => value === DEFAULT_ATTRIBUTE;

        switch (buttonName) {
            case 'health':
                return highAttributeSelected(totalHp);
            case 'speed':
                return highAttributeSelected(speed);
            case 'attack4':
                return this.hasSelectedDice() && defaultAttributeSelected(atkDiceMax);
            case 'attack6':
                return highAttributeSelected(atkDiceMax);
            case 'defense4':
                return this.hasSelectedDice() && defaultAttributeSelected(defDiceMax);
            case 'defense6':
                return highAttributeSelected(defDiceMax);
            default:
                return undefined;
        }
    }

    getAttributes() {
        this.setAllStats();
        return this.attributes;
    }

    private setAllStats() {
        this.attributes.currentHp = this.attributes.totalHp;
        this.attributes.movementPointsLeft = this.attributes.speed;
        this.attributes.initialHp = this.attributes.totalHp;
        this.attributes.initialAttack = this.attributes.attack;
        this.attributes.initialDefense = this.attributes.defense;
        this.attributes.initialSpeed = this.attributes.speed;
    }

    private hasName() {
        return this.name.trim();
    }

    private hasSelectedAttributes() {
        const { totalHp, speed } = this.attributes;
        const selectedHealthSpeed = totalHp === DEFAULT_ATTRIBUTE && speed === DEFAULT_ATTRIBUTE;
        return !selectedHealthSpeed && this.hasSelectedDice();
    }

    private hasSelectedDice() {
        const { atkDiceMax, defDiceMax } = this.attributes;
        return !(atkDiceMax === DEFAULT_ATTRIBUTE && defDiceMax === DEFAULT_ATTRIBUTE);
    }

    private setAttribute(highAttribute: keyof Attributes, defaultAttribute: keyof Attributes) {
        this.attributes[highAttribute] = HIGH_ATTRIBUTE;
        this.attributes[defaultAttribute] = DEFAULT_ATTRIBUTE;
    }
}
