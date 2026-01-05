import { GameObject } from '@common/interfaces/game-object';
import { Player } from '@common/interfaces/player';
import { Server, Socket } from 'socket.io';
export interface InfoSwap {
    server?: Server;
    client?: Socket;
    player?: Player;
    oldInventory?: GameObject[];
    modifiedInventory?: GameObject[];
    droppedItem?: number;
}
