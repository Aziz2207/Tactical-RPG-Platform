import { LogType } from '@app/constants';
import { ILogMessage } from '@app/interfaces/log.interface';
import { TileType } from '@common/constants';
import { CombatPlayers } from '@common/interfaces/combat-info';
import { Player, Status } from '@common/interfaces/player';
import { gameObjects } from '@common/objects-info';
import { ServerToClientEvent } from '@common/socket.events';
import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
@Injectable()
export class GameLogsService {
    private readonly logger = new Logger(GameLogsService.name);
    logs = new Map<string, ILogMessage[]>();
    lastLog = new Map<string, string>();

    sendDebugLog(isDebugMode: boolean, roomId: string, server: Server) {
        const message = this.generateDebugMessage(isDebugMode);
        this.sendLog(roomId, server, [], message);
    }

    sendDoorLog(tile: TileType, player: Player, roomId: string, server: Server) {
        const message =
            tile === TileType.OpenDoor
                ? this.generatePlayerLogMessage(LogType.OpenDoor, player.name)
                : this.generatePlayerLogMessage(LogType.CloseDoor, player.name);
        this.sendLog(roomId, server, [player], message);
    }

    sendEndGameLog(players: Player[], roomId: string, server: Server) {
        const message = this.generateEndGameMessage(players);
        this.sendLog(roomId, server, players, message);
    }

    sendGlobalCombatLog(roomId: string, server: Server, combatPlayers: CombatPlayers, logType: LogType): void {
        const { attacker, defender } = combatPlayers;
        const message = this.generatePlayerLogMessage(logType, attacker.name, defender.name);
        this.sendLog(roomId, server, [attacker, defender], message);
    }

    sendPlayerLog(roomId: string, server: Server, player: Player, logType: LogType) {
        const message = this.generatePlayerLogMessage(logType, player.name);
        this.sendLog(roomId, server, [player], message);
    }

    sendCombatActionLog(roomId: string, server: Server, combatPlayers: CombatPlayers, logType: LogType) {
        const message = this.generatePlayerLogMessage(logType, combatPlayers.attacker.name);
        this.sendLogToCombatPlayers(roomId, server, combatPlayers, message);
    }

    sendCombatResultLog(roomId: string, server: Server, combatPlayers: CombatPlayers) {
        const message = this.generateCombatResultMessage(combatPlayers);
        this.sendLogToCombatPlayers(roomId, server, combatPlayers, message);
    }

    sendItemLog(player: Player, roomId: string, server: Server, itemPickedUp: number) {
        const message = this.generateItemPickupMessage(player, itemPickedUp);
        this.sendLog(roomId, server, [player], message);
    }

    private generateItemPickupMessage(player: Player, item: number) {
        const fullItem = gameObjects.find((object) => object.id === item);
        const message = `GAME.LOGS.ITEM_PICKED_UP|playerName:${player.name}|itemKey:${fullItem.name}`;
        // this.logger.log('Generated item pickup message:', message);
        // this.logger.log('Player name:', player.name);
        // this.logger.log('Item name:', fullItem.name);
        return message;
    }

    private createLog(players: Player[], message: string, roomId: string) {
        const date = new Date();
        const newLog = { message, timestamp: date, players };
        if (!this.logs.has(roomId)) {
            this.logs.set(roomId, []);
        }
        this.logs.get(roomId).push(newLog);
        return newLog;
    }

    private generateCombatResultMessage(combatPlayers: CombatPlayers): string {
        const { attacker, defender, combatResultDetails } = combatPlayers;
        const { attackValues, defenseValues } = combatResultDetails;
        return `GAME.LOGS.COMBAT_RESULT|attack:${attacker.attributes.attack}|attackDice:${attackValues.diceValue}|attackTotal:${attackValues.total}|defense:${defender.attributes.defense}|defenseDice:${defenseValues.diceValue}|defenseTotal:${defenseValues.total}`;
    }

    private generateDebugMessage(isDebugMode: boolean): string {
        return isDebugMode ? 'GAME.LOGS.DEBUG_START' : 'GAME.LOGS.DEBUG_END';
    }

    private generateEndGameMessage(players: Player[]): string {
        const activePlayerNames = players
            .filter((player) => player.status !== Status.Disconnected)
            .map((player) => player.name)
            .join(', ');
        return `GAME.LOGS.END_GAME|playerNames:${activePlayerNames}`;
    }

    private generatePlayerLogMessage(logType: LogType, playerName: string, defenderName?: string): string {
        switch (logType) {
            case LogType.StartTurn:
                return `GAME.LOGS.START_TURN|playerName:${playerName}`;
            case LogType.GiveUp:
                return `GAME.LOGS.GIVE_UP|playerName:${playerName}`;
            case LogType.OpenDoor:
                return `GAME.LOGS.OPEN_DOOR|playerName:${playerName}`;
            case LogType.CloseDoor:
                return `GAME.LOGS.CLOSE_DOOR|playerName:${playerName}`;
            case LogType.WinCombat:
                return `GAME.LOGS.WIN_COMBAT|playerName:${playerName}`;
            case LogType.EvadeCombatFail:
                return `GAME.LOGS.EVADE_COMBAT_FAIL|playerName:${playerName}`;
            case LogType.EvadeCombatSuccess:
                return `GAME.LOGS.EVADE_COMBAT_SUCCESS|playerName:${playerName}`;
            case LogType.NoWinnerCombat:
                return `GAME.LOGS.NO_WINNER_COMBAT|playerName:${playerName}|defenderName:${defenderName}`;
            case LogType.StartCombat:
                return `GAME.LOGS.START_COMBAT|playerName:${playerName}|defenderName:${defenderName}`;
            case LogType.AttackFail:
                return `GAME.LOGS.ATTACK_FAIL|playerName:${playerName}`;
            case LogType.AttackSuccess:
                return `GAME.LOGS.ATTACK_SUCCESS|playerName:${playerName}`;
            default:
                return `GAME.LOGS.UNKNOWN`;
        }
    }

    private sendLog(roomId: string, server: Server, players: Player[], message: string) {
        const currentLog = this.lastLog.get(roomId);
        if (currentLog !== message) {
            this.lastLog.set(roomId, message);
            const log = this.createLog(players, message, roomId);
            server.to(roomId).emit(ServerToClientEvent.LogReceived, log);
        }
    }

    private sendLogToCombatPlayers(roomId: string, server: Server, players: CombatPlayers, message: string) {
        const log = this.createLog([players.attacker, players.defender], message, roomId);
        server.to(players.attacker.id).emit(ServerToClientEvent.LogReceived, log);
        server.to(players.defender.id).emit(ServerToClientEvent.LogReceived, log);
    }
}
