import { CombatPlayers } from '@common/interfaces/combat-info';

export interface StartFightData {
    combatPlayers: CombatPlayers;
    isActivePlayerAttacker: boolean;
}
