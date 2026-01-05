export interface Challenge {
    id: number;
    key: ChallengeKey;
    title: string;
    description: string;
    goal: number;
    reward: number;
}

export enum ChallengeKey {
    VisitedTiles = 'explorer',
    Evasions = 'strategicRetreat',
    Items = 'relicHunter',
    Wins ='spilledBlood',
    DoorsInteracted = 'doorMaster',
}