import { GameTile } from './interfaces/game-tile'
import { TileType } from './constants'

export const gameTiles: GameTile[] = [
    {
        id: TileType.Ground,
        name: 'TILE_INFO.GROUND.NAME',
        image: './assets/images/tiles/grass.jpg',
        descriptions: [
            'TILE_INFO.GROUND.DESC1',
            'TILE_INFO.GROUND.DESC2',
            'TILE_INFO.GROUND.DESC3',
        ],
    },
    {
        id: TileType.Ice,
        name: 'TILE_INFO.ICE.NAME',
        image: './assets/images/tiles/ice.jpg',
        descriptions: [
            'TILE_INFO.ICE.DESC1',
            'TILE_INFO.ICE.DESC2',
            'TILE_INFO.ICE.DESC3',
        ],
    },
    {
        id: TileType.Water,
        name: 'TILE_INFO.WATER.NAME',
        image: './assets/images/tiles/water.jpg',
        descriptions: [
            'TILE_INFO.WATER.DESC1',
            'TILE_INFO.WATER.DESC2',
        ],
    },
    {
        id: TileType.Wall,
        name: 'TILE_INFO.WALL.NAME',
        image: './assets/images/tiles/wall.jpg',
        descriptions: [
            'TILE_INFO.WALL.DESC1',
            'TILE_INFO.WALL.DESC2',
            'TILE_INFO.WALL.DESC3',
        ],
    },
    {
        id: TileType.ClosedDoor,
        name: 'TILE_INFO.CLOSED_DOOR.NAME',
        image: './assets/images/tiles/closed-door.jpg',
        descriptions: [
            'TILE_INFO.CLOSED_DOOR.DESC1',
            'TILE_INFO.CLOSED_DOOR.DESC2',
        ],
    },
    {
        id: TileType.OpenDoor,
        name: 'TILE_INFO.OPEN_DOOR.NAME',
        image: './assets/images/tiles/open-door.jpg',
        descriptions: [
            'TILE_INFO.OPEN_DOOR.DESC1',
            'TILE_INFO.OPEN_DOOR.DESC2',
        ],
    },
]
