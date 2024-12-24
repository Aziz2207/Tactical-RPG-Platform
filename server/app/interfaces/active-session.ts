import { Combat } from '@common/interfaces/combat';
import { Room } from '@common/interfaces/room';
import { Server } from 'socket.io';
import { GameTimer } from './game-timer';

export interface ActiveSession {
    room: Room;
    turnIndex: number;
    timer: GameTimer;
    startTime: Date;
    server: Server;
    turnActive: boolean;
    combat?: Combat;
    combatTimer?: GameTimer;
    reachableTiles?: [number, number][];
    movementUnlocked?: boolean;
    debugMode?: boolean;
    playersInEndGameView?: Set<string>;
}
