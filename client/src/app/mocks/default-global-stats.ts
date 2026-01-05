import { GlobalPostGameStats } from '@common/interfaces/global-post-game-stats';

export const defaultGlobalStats: GlobalPostGameStats = {
    gameDuration: '00:00',
    turns: 0,
    globalTilesVisited: [],
    doorsInteracted: [],
    nbFlagBearers: 0,
};
