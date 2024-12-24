import { Map } from "./map";
import { Player } from "./player";

export interface Room {
    code: string;
    players: Player[];
    maxPlayers: number;
    isLocked: boolean;
    takenCharacters: string[]; // types of the taken characters
    isActive: boolean;
    map?: Map;
}