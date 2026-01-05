import { Player } from './player';

export enum PlayerStatType {
    Combats = 'combats',
    Victories = 'victories',
    Draws = 'draws',
    Defeats = 'defeats',
    DamageDealt = 'damageDealt',
    DamageTaken = 'damageTaken',
    ItemsObtained = 'itemsObtained',
    TilesVisited = 'tilesVisited',
}

export interface PostGameStat {
    id: number;
    key: keyof Player['postGameStats'];
    displayText: string;
    explanations: string;
}
