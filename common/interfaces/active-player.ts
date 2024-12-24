import { Player } from './player';

export interface ActivePlayer {
    player: Player;
    position: { x: number; y: number };
}
