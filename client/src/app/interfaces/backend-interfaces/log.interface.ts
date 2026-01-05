import { Player } from '@common/interfaces/player';

export interface ILogMessage {
    message: string;
    timestamp: Date;
    players: Player[];
}
