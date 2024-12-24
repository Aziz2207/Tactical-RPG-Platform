import { Player } from './player';
import { Position } from './position';

export interface TurnObject {
    player: Player;
    possibleMoves: Position[];
}