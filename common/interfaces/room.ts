import { Navigation } from '../../server/app/classes/navigation/navigation';
import { Stopwatch } from '../../server/app/classes/stopwatch/stopwatch';
import { Game } from './game';
import { GlobalPostGameStats } from './global-post-game-stats';
import { Avatar, Player, PlayerRecord } from './player';

export enum GameStatus {
    Lobby = 'lobby',
    Started = 'started',
    Ended = 'ended',
}

export enum GameAvailability {
    Public = 'public',
    FriendsOnly = 'friends-only'
}

export interface Room {
  gameMap: Game;
  roomId: string;
  listPlayers: Player[];
  availableAvatars: Avatar[];
  adminId: string;
  isLocked: boolean;
  gameStatus: GameStatus;
  navigation?: Navigation;
  globalPostGameStats: GlobalPostGameStats;
  isDebug?: boolean;
  stopwatch?: Stopwatch;
  gameAvailability?: GameAvailability;
  entryFee?: number;
  dropInEnabled?: boolean;
  quickEliminationEnabled?: boolean;
  playersRecords?: Map<string, PlayerRecord>;
}
