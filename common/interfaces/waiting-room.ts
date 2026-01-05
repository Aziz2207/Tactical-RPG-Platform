import { GameStatus } from "./room";

export interface WaitingRoom {
  roomId: string;
  gameName: string;
  gameImage: string;
  gameDescription: string;
  gameMode: string;
  gameDimension: number;
  playerCount: number;
  maxPlayers: number;
  gameAvailability: string;
  entryFee: number;
  dropInEnabled: boolean;
  quickEliminationEnabled: boolean;
  adminId: string;
  gameStatus: GameStatus;
  canJoin:Boolean;
}