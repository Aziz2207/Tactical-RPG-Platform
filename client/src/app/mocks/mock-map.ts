import { NB_ITEMS_MEDIUM_MAP, NO_ITEM, RANDOM_ITEM, SIZE_MEDIUM_MAP } from '@app/constants';
import { Info } from '@app/interfaces/info';
import { GameMode, TileType } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { Position } from '@common/interfaces/player';

export const dummyInfo: Info = {
    image: 'image file',
    name: 'a map',
    description: 'a map description',
    grid: [[TileType.Ground, TileType.Ground, TileType.Ground, TileType.Ground, TileType.Ground]],
    items: [[NO_ITEM, NO_ITEM, RANDOM_ITEM, NO_ITEM, NO_ITEM, NO_ITEM]],
    height: SIZE_MEDIUM_MAP,
    mode: GameMode.Classic,
};

export const mockPositions: Position[] = [{ x: 1, y: 1 }];

export const dummyMap: Game = {
    _id: 'map to replace in DB',
    name: 'map name',
    description: 'description',
    visible: true,
    mode: GameMode.Classic,
    image: 'image source',
    nbPlayers: NB_ITEMS_MEDIUM_MAP,
    tiles: [[TileType.Ground, TileType.Ground, TileType.Ground, TileType.Ground, TileType.Ground, TileType.Ground]],
    itemPlacement: [[NO_ITEM, NO_ITEM, RANDOM_ITEM, NO_ITEM, RANDOM_ITEM]],
    dimension: SIZE_MEDIUM_MAP,
    isSelected: false,
    lastModification: new Date(),
};

export const mockGameNavigation: Game = {
    _id: '1',
    name: 'Mock Game',
    description: 'This is a mock game for testing purposes.',
    visible: true,
    mode: 'single-player',
    nbPlayers: 1,
    image: 'mock-image.png',
    tiles: [
        [TileType.Water, TileType.Water, TileType.Wall],
        [TileType.Water, TileType.OpenDoor, TileType.Wall],
        [TileType.Water, TileType.Water, TileType.Water],
    ],
    dimension: 3,
    itemPlacement: [
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ],
    isSelected: false,
    lastModification: new Date(),
};

export const mockNeighborGame: Game = {
    _id: '1',
    name: 'map name',
    description: 'description for map',
    visible: true,
    mode: GameMode.Classic,
    nbPlayers: 1,
    image: 'image for map',
    tiles: [
        [TileType.Ground, TileType.Ground, TileType.Wall],
        [TileType.Ground, TileType.Ground, TileType.Ground],
        [TileType.Wall, TileType.Ground, TileType.Ground],
    ],
    dimension: 3,
    itemPlacement: [
        [1, 0, 0],
        [0, 0, 1],
        [0, 0, 0],
    ],
    isSelected: false,
    lastModification: new Date(),
};

export const mockSmallGrid: number[][] = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];
