export interface Game {
  _id: string;
  name: string;
  description: string;
  visible?: boolean;
  mode: string;
  nbPlayers: number;
  image: string;
  tiles: number[][];
  dimension: number;
  itemPlacement: number[][];
  isSelected: boolean;
  lastModification: Date;
  creatorId?: string;
  state?: string;
  creatorUsername?: string;
}
