import { GameObject } from './game-object';
import { Challenge } from './challenges';

export interface Avatar {
  id?: number;
  title?: string;
  name: string;
  src: string;
  isSelected?: boolean;
  isTaken?: boolean;
  price: number;
  owned?: boolean;
}

export enum Status {
  Player = "regular-player",
  Admin = "admin",
  Bot = "bot",
  Disconnected = "disconnected",
  PendingDisconnection = "pendingDisconnection",
}

export enum Behavior {
  Sentient = "sentient",
  Aggressive = "aggressive",
  Defensive = "defensive",
}

export interface Player {
  id: string;
  uid: string;
  attributes: Attributes;
  avatar?: Avatar;
  isActive: boolean;
  name: string;
  status: Status;
  postGameStats: PostGameStats;
  inventory: GameObject[];
  position: Position;
  positionHistory: Position[];
  collectedItems?: number[];
  spawnPosition: Position;
  behavior: Behavior;
  assignedChallenge: Challenge;
}
export interface PlayerRecord {
  uid: string;
  attributes: Attributes;
  postGameStats: PostGameStats;
  name: string;
  dropIns: number[];
  dropOuts: number[];
  avatar: Avatar;
  status: Status;
  assignedChallenge: Challenge;
}
export interface Attributes {
  initialHp?: number;
  initialSpeed?: number;
  initialAttack?: number;
  initialDefense?: number;
  totalHp: number;
  currentHp: number;
  speed: number;
  movementPointsLeft: number;
  maxActionPoints: number;
  actionPoints: number;
  attack: number;
  atkDiceMax: number;
  defense: number;
  defDiceMax: number;
  evasion: number;
}

export interface PostGameStats {
  combats: number;
  victories: number;
  draws: number;
  evasions: number;
  defeats: number;
  damageDealt: number;
  damageTaken: number;
  itemsObtained: number;
  tilesVisited: number;
  doorsInteracted: number;
}

export interface Position {
  x: number;
  y: number;
}
