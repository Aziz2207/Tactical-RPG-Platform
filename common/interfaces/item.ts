import { ItemEnum } from '../item-enum';

export interface Item {
    itemType: ItemEnum;
    imgSrc: string;
    isRandom: boolean;
    id: number;
    isOnGrid: boolean;
    description: string;
    hasEffect: boolean;
}

export const itemProperties = {
    [ItemEnum.ABomb]: {
        imgSrc: './assets/abomb.png',
        isRandom: true,
        description: "Bombe-Attaque : Lorsqu'il te reste 1 point de vie, ta prochaine attaque sera double!",
        hasEffect: true,
    },
    [ItemEnum.Battery]: {
        imgSrc: './assets/battery.png',
        isRandom: true,
        description: 'Batterie : Obtient 2 points de plus en défense, mais 1 point en moins en attaque.',
        hasEffect: true,
    },
    [ItemEnum.Chip]: {
        imgSrc: './assets/chip.png',
        isRandom: true,
        description: 'Chip-Hack : Trompe le système en obtenant 2 fois plus de tentatives de fuite en combat.',
        hasEffect: true,
    },
    [ItemEnum.Pic]: {
        imgSrc: './assets/pic.png',
        isRandom: true,
        description: "Pic : Casse la glace.Tu n'a aucune chance de glisser maintenant",
        hasEffect: true,
    },
    [ItemEnum.Potion]: {
        imgSrc: './assets/potion.png',
        isRandom: true,
        description: 'Obtient 2 points de vie en vitesse, mais perd 1 point de vie.',
        hasEffect: true,
    },
    [ItemEnum.NanoBot]: {
        imgSrc: './assets/nanobot.png',
        isRandom: true,
        description: "Lorsqu'il reste 1 victoire à ton adversaire pour gagner, double ton attaque de défense!",
        hasEffect: true,
    },
    [ItemEnum.StartPoint]: { imgSrc: './assets/depart.jpeg', isRandom: false, description: 'Point de départ', hasEffect: false },
    [ItemEnum.Flag]: {
        imgSrc: './assets/flag.png',
        isRandom: false,
        description: 'Drapeau. Dans le mode <<capture the flag>>, attrape ce drapeau pour gagner',
        hasEffect: false,
    },
    [ItemEnum.Mystery]: {
        imgSrc: './assets/mystery.png',
        isRandom: true,
        description: 'Boîte mystérieuse : Un item sera revelé au début de la partie.',
        hasEffect: false,
    },
};
