import { ActiveSession } from '@app/interfaces/active-session';
import { ActionsService } from '@app/services/actions/actions.service';
import { CombatService } from '@app/services/combat/combat-service.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { TileValidityService } from '@app/services/tile-validity/tile-validity.service';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { CombatMove } from '@common/interfaces/combat';
import { Item } from '@common/interfaces/item';
import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
export class GameControllerService {
    constructor(
        private playerMovementService: PlayerMovementService,
        private tileValidityService: TileValidityService,
        private combatService: CombatService,
        private actionsService: ActionsService,
    ) {}

    initialiseGame(newSession: ActiveSession, server: Server): void {
        this.playerMovementService.loadCharacters(server, newSession);
        server.to(newSession.room.code).emit(GameLogicEvents.TurnEnded, newSession.room.players[0]);
    }

    toggleDebugMode(session: ActiveSession, server: Server): void {
        session.debugMode = !session.debugMode;
        const reachableTiles = this.tileValidityService.getReachableTiles(session.room.map, session.room.players[session.turnIndex]);
        server.to(session.room.code).emit('availableTiles', reachableTiles);
        server.to(session.room.code).emit(GameLogicEvents.ToggleDebugMode, session.debugMode);
    }

    movePlayer(socket: Socket, session: ActiveSession, path: [number, number][], server: Server): void {
        path.shift();
        this.playerMovementService.movePlayer(socket.id, session, path, server);
    }

    teleportPlayerDebug(socket: Socket, session: ActiveSession, position: Position, server: Server): void {
        this.playerMovementService.teleportPlayerDebug(socket.id, session, position, server);
    }

    combatMove(session: ActiveSession, server: Server, move: CombatMove): void {
        this.combatService.combatMove(session, server, move);
    }

    startCombat(session: ActiveSession, socket: Socket, victimUser: string, server: Server): void {
        this.combatService.beginCombat(session, socket.id, victimUser, server);
    }

    toggleDoor(session: ActiveSession, socket: Socket, position: Position, server: Server): void {
        this.actionsService.toggleDoor(socket.id, session, position, server);
    }

    updateInventory(session: ActiveSession, socket: Socket, inventory: Item[], server: Server) {
        this.actionsService.updatePlayerAttributes(socket.id, session, inventory, server);
    }

    handleDisconnectionCombat(session: ActiveSession, player: Player, server: Server) {
        this.combatService.leaveRoom(player, session, server);
    }

    handleDisconnectionInventory(session: ActiveSession, player: Player, server: Server) {
        this.actionsService.handleCombatEnd(player, session, server);
    }
}
