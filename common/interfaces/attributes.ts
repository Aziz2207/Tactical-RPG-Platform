export interface Attributes {
    speedPoints: number;
    currentSpeed: number;
    lifePoints: number;
    currentHP: number;
    offensePoints: number;
    defensePoints: number;
    diceChoice: DiceChoice;
    actionLeft: number;
}

export type DiceChoice = 'attack' | 'defense'; //marks which one has the D6
