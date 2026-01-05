import { Player } from '@common/interfaces/player';

export interface LogMessage {
    id: number;
    timestamp: Date;
    message: string;
    players: Player[];
}
