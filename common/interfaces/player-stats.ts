export interface PlayerStats {
    username: string;
    combats: number;             
    escapes: number;           
    victories: number;          
    defeats: number;             
    healthLost: number;          
    healthInflicted: number;     
    itemsCollected: number;       
    tilesVisited: Set<string>;  
    percentageTilesVisited?: number;
}
