import { defaultPostGameStats } from '@app/default-attributes';
import { CombatInfos, CombatPlayers, CombatResultDetails } from '@common/interfaces/combat-info';
import { Behavior, Player, Status } from '@common/interfaces/player';
import { mockRoom } from './mock-room';
import { CHALLENGES } from '@app/constants';

export const mockCombatResultDetails: CombatResultDetails = {
    attackValues: { diceValue: 0, total: 0 },
    defenseValues: { diceValue: 0, total: 0 },
};

export const mockAttacker: Player = {
    id: 'attackerId',
    attributes: {
        totalHp: 10,
        currentHp: 10,
        speed: 4,
        movementPointsLeft: 3,
        maxActionPoints: 1,
        actionPoints: 1,
        attack: 10,
        atkDiceMax: 6,
        defense: 1,
        defDiceMax: 1,
        evasion: 2,
    },
    avatar: undefined,
    isActive: true,
    name: 'name',
    status: Status.Player,
    postGameStats: defaultPostGameStats,
    positionHistory: [],
    inventory: [],
    position: { x: 0, y: 0 },
    behavior: Behavior.Sentient,
    spawnPosition: { x: 0, y: 0 },
    assignedChallenge: CHALLENGES[0]
};

export const mockDefender: Player = {
    id: 'defenderId',
    attributes: {
        totalHp: 10,
        currentHp: 5,
        speed: 4,
        movementPointsLeft: 3,
        maxActionPoints: 1,
        actionPoints: 1,
        attack: 10,
        atkDiceMax: 6,
        defense: 5,
        defDiceMax: 6,
        evasion: 2,
    },
    avatar: undefined,
    isActive: true,
    name: 'name',
    status: Status.Player,
    postGameStats: defaultPostGameStats,
    positionHistory: [],
    inventory: [],
    position: { x: 5, y: 0 },
    behavior: Behavior.Sentient,
    spawnPosition: { x: 1, y: 0 },
    assignedChallenge: CHALLENGES[0]
};

export const mockCombatPlayers: CombatPlayers = {
    attacker: mockAttacker,
    defender: mockDefender,
    combatResultDetails: mockCombatResultDetails,
};

export const mockCombatInfos: CombatInfos = {
    combatPlayers: mockCombatPlayers,
    gameTime: 60,
    room: mockRoom,
    failEvasion: false,
    checkedXiphos: false,
};
