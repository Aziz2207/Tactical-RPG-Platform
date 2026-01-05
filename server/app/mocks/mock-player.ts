import { DEFAULT_AVATARS } from '@common/avatars-info';
import { Behavior, Player, Status } from '@common/interfaces/player';
import { gameObjects } from '@common/objects-info';
import { defaultPostGameStats } from './mock-players';
import { CHALLENGES } from '@app/constants';

export const playerNavigation: Player = {
    uid: '123',
    id: '123',
    attributes: {
        totalHp: 100,
        currentHp: 100,
        speed: 4,
        movementPointsLeft: 3,
        maxActionPoints: 1,
        actionPoints: 1,
        attack: 1,
        atkDiceMax: 1,
        defense: 1,
        defDiceMax: 1,
        evasion: 2,
    },
    avatar: { id: 20, name: 'a', src: 'a.img', isSelected: true, isTaken: true, price: 0 },
    isActive: true,
    name: 'Hestia',
    status: Status.Player,
    postGameStats: defaultPostGameStats,
    inventory: [],
    position: { x: 0, y: 0 },
    spawnPosition: { x: 0, y: 0 },
    behavior: Behavior.Sentient,
    positionHistory: [],
    assignedChallenge: CHALLENGES[0]
};

export const playerItemSwap: Player = {
    uid: '123',
    id: '123',
    attributes: {
        totalHp: 4,
        currentHp: 4,
        speed: 4,
        movementPointsLeft: 1,
        maxActionPoints: 1,
        actionPoints: 1,
        attack: 1,
        atkDiceMax: 1,
        defense: 1,
        defDiceMax: 1,
        evasion: 2,
    },
    avatar: DEFAULT_AVATARS[0],
    isActive: true,
    name: 'swap item',
    status: Status.Player,
    postGameStats: defaultPostGameStats,
    inventory: [gameObjects[0], gameObjects[3]],
    position: { x: 0, y: 0 },
    spawnPosition: { x: 0, y: 0 },
    behavior: Behavior.Sentient,
    positionHistory: [],
    assignedChallenge: CHALLENGES[0]
};
