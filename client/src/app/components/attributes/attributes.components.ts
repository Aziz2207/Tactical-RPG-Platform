import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CONSTANTS } from '@common/constants';
import { Attributes } from '@common/interfaces/attributes';

@Component({
    selector: 'app-attribute-display',
    standalone: true,
    templateUrl: './attributes.components.html',
    styleUrl: './attributes.components.scss',
})
export class AttributesComponent implements OnInit {
    @Output() validAttributs = new EventEmitter<boolean>();
    @Output() playerAttributes = new EventEmitter<Attributes>();

    attributes: Attributes;
    validateAttributes: boolean;
    diceChosen: boolean;
    bonusApplied: boolean;
    activeBonusButton: string | null;
    activeDiceButton: string | null;
    tooltipVisible: string | null;

    ngOnInit(): void {
        this.attributes = {
            lifePoints: 4,
            speedPoints: 4,
            currentSpeed: 4,
            defensePoints: 4,
            offensePoints: 4,
            diceChoice: 'attack',
            currentHP: 4,
            actionLeft: 1,
        };
        this.validateAttributes = false;
        this.diceChosen = false;
        this.bonusApplied = false;
        this.activeBonusButton = null;
        this.activeDiceButton = null;
        this.tooltipVisible = null;
    }

    addBonus(speed: boolean, life: boolean) {
        this.activeBonusButton = speed ? 'speed' : 'life';
        if (speed) {
            if (this.bonusApplied && this.attributes.lifePoints === CONSTANTS.VALUE_ATTRIBUTES_MAX) {
                this.attributes.lifePoints -= 2;
                this.attributes.currentHP -= 2;
                this.attributes.speedPoints += 2;
                this.attributes.currentSpeed += 2;
            } else if (!this.bonusApplied) {
                this.attributes.speedPoints += 2;
                this.attributes.currentSpeed += 2;
            }
        } else if (life) {
            if (this.bonusApplied && this.attributes.speedPoints === CONSTANTS.VALUE_ATTRIBUTES_MAX) {
                this.attributes.speedPoints -= 2;
                this.attributes.currentSpeed -= 2;
                this.attributes.currentHP += 2;
                this.attributes.lifePoints += 2;
            } else if (!this.bonusApplied) {
                this.attributes.lifePoints += 2;
                this.attributes.currentHP += 2;
            }
        }
        this.bonusApplied = true;
        this.updateCanJoin();
    }

    giveSixDToAttack() {
        if (!this.diceChosen || this.attributes.diceChoice === 'defense') {
            this.attributes.diceChoice = 'attack';
            this.diceChosen = true;
            this.updateCanJoin();
        }
    }

    giveSixDtoDefense() {
        if (!this.diceChosen || this.attributes.diceChoice === 'attack') {
            this.attributes.diceChoice = 'defense';
            this.diceChosen = true;
            this.updateCanJoin();
        }
    }

    updateCanJoin() {
        this.validateAttributes = this.bonusApplied && this.diceChosen;
        this.validAttributs.emit(this.validateAttributes);
        this.playerAttributes.emit(this.attributes);
    }

    chooseDice(choice: 'attack' | 'defense') {
        this.activeDiceButton = choice;
        this.attributes.diceChoice = choice;
        this.diceChosen = true;
        this.updateCanJoin();
    }

    showTooltip(attribute: string): void {
        this.tooltipVisible = attribute;
    }

    hideTooltip(): void {
        this.tooltipVisible = null;
    }
}
