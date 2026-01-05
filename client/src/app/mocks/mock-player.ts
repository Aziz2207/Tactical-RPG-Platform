import { defaultPostGameStats } from '@app/default-attributes';
import { PlayerObjects, Status } from '@app/interfaces/player-object';
import { ObjectType } from '@common/constants';
import { Behavior, Player } from '@common/interfaces/player';

export const mockPlayer: PlayerObjects = {
    id: 0,
    avatar: './assets/images/characters/Hephaestus.webp',
    status: Status.Player,
    name: 'Jar Jar Binks',
    victories: 2,
    isActive: true,
    attributes: {
        totalHp: 6,
        currentHp: 4,
        speed: 4,
        maxActionPoints: 2,
        actionPoints: 1,
        movementPointsLeft: 1,
        attack: 4,
        atkDiceMax: 6,
        defense: 4,
        defDiceMax: 4,
        inventory: [
            {
                id: ObjectType.Trident,
                name: 'Trident',
                description: 'Trident de Poséidon',
                count: 1,
                image: './assets/images/objects/poseidon-trident.jpg/',
            },
            {
                id: ObjectType.Sandal,
                name: 'Sandales ailées',
                description: 'Sandales augmentant la stat de rapidité',
                count: 1,
                image: './assets/images/objects/winged-sandals.jpg/',
            },
        ],
    },
};

export const playerNavigation: Player = {
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
    behavior: Behavior.Sentient,
    spawnPosition: { x: 0, y: 0 },
    positionHistory: [],
};
