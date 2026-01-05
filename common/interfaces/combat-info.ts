import { Player } from './player';
import { Room } from './room';

export interface CombatInfos {
    combatPlayers: CombatPlayers;
    gameTime: number;
    room: Room;
    failEvasion: boolean;
    checkedXiphos: boolean;
}

export interface CombatPlayers {
    attacker: Player;
    defender: Player;
    combatResultDetails?: CombatResultDetails;
}

export interface CombatResult {
    total: number;
    diceValue: number;
}

export interface CombatResultDetails {
    attackValues: CombatResult;
    defenseValues: CombatResult;
}
