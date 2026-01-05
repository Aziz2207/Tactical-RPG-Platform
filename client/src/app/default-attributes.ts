import { DEFAULT_ACTION_POINT, DEFAULT_ATTRIBUTE, DEFAULT_EVASION_POINT } from '@app/constants';
import { Attributes, PostGameStats } from '@common/interfaces/player';

export const defaultAttributes: Attributes = {
    totalHp: DEFAULT_ATTRIBUTE,
    currentHp: DEFAULT_ATTRIBUTE,
    speed: DEFAULT_ATTRIBUTE,
    movementPointsLeft: DEFAULT_ATTRIBUTE,
    maxActionPoints: DEFAULT_ACTION_POINT,
    actionPoints: DEFAULT_ACTION_POINT,
    attack: DEFAULT_ATTRIBUTE,
    atkDiceMax: DEFAULT_ATTRIBUTE,
    defense: DEFAULT_ATTRIBUTE,
    defDiceMax: DEFAULT_ATTRIBUTE,
    evasion: DEFAULT_EVASION_POINT,
};

export const defaultPostGameStats: PostGameStats = {
    combats: 0,
    victories: 0,
    draws: 0,
    evasions: 0,
    defeats: 0,
    damageDealt: 0,
    damageTaken: 0,
    itemsObtained: 0,
    tilesVisited: 0,
    doorsInteracted: 0,
};
