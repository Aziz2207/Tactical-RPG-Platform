import { AttackResult } from './attack-result';
import { Combatant } from "./combatant";
import { Player } from './player';

export interface Combat {
    attacker: Combatant;
    defender: Combatant;
    attackResult?: AttackResult;
    escaped?: boolean;
    victor?: Player;
    loser?: Player;
    locked: boolean;
}

export type CombatMove = 'run' | 'attack';
