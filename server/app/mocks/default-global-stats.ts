import { GlobalPostGameStats } from '@common/interfaces/global-post-game-stats';

export const defaultGlobalStats: GlobalPostGameStats = {
    gameDuration: '00:00',
    turns: 1,
    globalTilesVisited: [],
    doorsInteracted: [],
    nbFlagBearers: 0,
};

export const mockGlobalStats: GlobalPostGameStats = {
    globalTilesVisited: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
    ],
    doorsInteracted: [
        { x: 5, y: 6 },
        { x: 7, y: 8 },
    ],
    turns: 5,
    nbFlagBearers: 2,
    gameDuration: '30min 00s',
};
