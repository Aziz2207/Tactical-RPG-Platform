export interface GlobalStats {
    totalTurns: number;
    tilesVisited: Set<string>;
    doorsToggled: Set<string>;
    gameDuration: number;
    flagHolders: Set<string>;
    percentageTilesVisited?: number;
    percentageDoorsToggled?: number;
    totalFlagHoldersCount?: number;
}