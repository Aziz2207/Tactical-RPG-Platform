import { Player } from "./player";

export interface Combatant {
    player: Player;
    runAttempts: number;
    onIce: boolean;
}