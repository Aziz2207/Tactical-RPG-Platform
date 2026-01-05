import { CHALLENGES } from '@app/constants';
import { defaultAttributes, defaultPostGameStats } from '@app/default-attributes';
import { Attributes, Behavior, Player, Status } from '@common/interfaces/player';
import { gameObjects } from '@common/objects-info';

const mockAttributes: Attributes = {
    totalHp: 4,
    currentHp: 4,
    speed: 4,
    movementPointsLeft: 4,
    maxActionPoints: 1,
    actionPoints: 1,
    attack: 4,
    atkDiceMax: 4,
    defense: 4,
    defDiceMax: 4,
    evasion: 2,
};

export const mockPlayers: Player[] = [
    {
        id: 'admin1234',
        attributes: mockAttributes,
        avatar: undefined,
        isActive: true,
        name: 'name',
        status: Status.Player,
        postGameStats: defaultPostGameStats,
        inventory: [],
        position: { x: 0, y: 0 },
        behavior: Behavior.Sentient,
        spawnPosition: { x: 0, y: 0 },
        positionHistory: [],
        assignedChallenge: CHALLENGES[0]
    },
    {
        id: '123',
        attributes: mockAttributes,
        avatar: undefined,
        isActive: false,
        name: 'name',
        status: Status.Admin,
        postGameStats: defaultPostGameStats,
        inventory: [],
        position: { x: 1, y: 1 },
        behavior: Behavior.Sentient,
        spawnPosition: { x: 1, y: 1 },
        positionHistory: [],
        assignedChallenge: CHALLENGES[0]
    },
    {
        id: 'id',
        attributes: mockAttributes,
        avatar: undefined,
        isActive: false,
        name: 'name',
        status: Status.Player,
        postGameStats: defaultPostGameStats,
        inventory: [],
        position: { x: 0, y: 0 },
        behavior: Behavior.Sentient,
        spawnPosition: { x: 0, y: 0 },
        positionHistory: [],
        assignedChallenge: CHALLENGES[0]
    },
];

export const mockInventoryPlayer: Player = {
    id: 'admin1234',
    attributes: mockAttributes,
    avatar: undefined,
    isActive: true,
    name: 'name',
    status: Status.Player,
    inventory: [gameObjects[0], gameObjects[1]],
    position: { x: 0, y: 0 },
    behavior: Behavior.Sentient,
    spawnPosition: { x: 0, y: 0 },
    postGameStats: defaultPostGameStats,
    positionHistory: [],
    assignedChallenge: CHALLENGES[0]
};

export const mockInventoryPlayerWithXiphos: Player = {
    id: 'admin1234',
    attributes: mockAttributes,
    avatar: undefined,
    isActive: true,
    name: 'name',
    status: Status.Player,
    inventory: [gameObjects[0], gameObjects[4]],
    position: { x: 0, y: 0 },
    behavior: Behavior.Sentient,
    spawnPosition: { x: 0, y: 0 },
    postGameStats: defaultPostGameStats,
    positionHistory: [],
    assignedChallenge: CHALLENGES[0]
};

export const baseBot: Player = {
    id: '0',
    avatar: { name: 'a', src: '', isSelected: true, isTaken: true, price: 0 },
    status: Status.Bot,
    name: 'Joueur virtuel',
    postGameStats: defaultPostGameStats,
    isActive: false,
    attributes: defaultAttributes,
    inventory: [],
    position: { x: 0, y: 0 },
    spawnPosition: { x: 0, y: 0 },
    behavior: Behavior.Sentient,
    positionHistory: [],
    assignedChallenge: CHALLENGES[0]
};
