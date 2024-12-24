import { ActiveSession } from '@app/interfaces/active-session';
import { CombatService } from '@app/services/combat/combat-service.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { TileValidityService } from '@app/services/tile-validity/tile-validity.service';
import { TurnService } from '@app/services/turn/turn.service';
import { CONSTANTS } from '@common/constants';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { Attributes } from '@common/interfaces/attributes';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Tile } from '@common/interfaces/tile';
import { ItemEnum } from '@common/item-enum';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

@Injectable()
export class VirtualPlayerService {
    defensiveItems = [ItemEnum.Battery, ItemEnum.NanoBot];
    offensiveItems = [ItemEnum.Potion, ItemEnum.ABomb];

    allCharacters: string[] = [
        'INFORMATIQUE',
        'LOGICIEL',
        'AEROSPATIAL',
        'ELECTRIQUE',
        'PHYSIQUE',
        'CIVIL',
        'MECANIQUE',
        'CHIMIQUE',
        'INDUSTRIEL',
        'MINES',
        'GEOLOGIQUE',
        'BIOMEDICAL',
    ];
    nameList: string[] = ['frboyer', 'Nikolay', 'J. Collin', 'DaddyChucky', 'SylvainMartel', 'Tarek', 'EricGermain', 'AurelRandom'];
    constructor(
        private playerMovementService: PlayerMovementService,
        private tileValidityService: TileValidityService,
        private eventEmitter: EventEmitter2,
        private turnService: TurnService,
        private combatService: CombatService,
    ) {
        this.eventEmitter.on(GameLogicEvents.VirtualPlayerTurn, (session: ActiveSession, server: Server, player: Player) => {
            this.playTurn(session, player, server);
        });
    }

    generateVirtualPlayer(takenCharacters: string[], existingNames: string[], isAgressive: boolean): Player {
        const virtualPlayer: Player = {
            userName: this.getRandomName(existingNames),
            characterType: this.getRandomCharacter(takenCharacters),
            attributes: this.generateRandomAttributes(),
            isHost: false,
            socketId: this.generateSocketId(),
            nbWins: 0,
            isVirtual: true,
            isAgressive,
            inventory: [],
            hasFlag: false,
        };
        return virtualPlayer;
    }

    playTurn(session: ActiveSession, virtualPlayer: Player, server: Server): void {
        const room = session.room;
        const reachableTiles = this.tileValidityService.getReachableTiles(room.map, virtualPlayer);
        const delay = Math.random() * CONSTANTS.VIRTUAL_PLAYER_DURATION_MAX + CONSTANTS.VIRTUAL_PLAYER_DURATION_MIN;
        setTimeout(async () => {
            if (virtualPlayer.isAgressive && this.turnService.hasTurn(session, virtualPlayer.socketId)) {
                await this.agressiveBehavior(virtualPlayer, session, server, reachableTiles);
            } else if (this.turnService.hasTurn(session, virtualPlayer.socketId)) {
                await this.defensiveBehavior(virtualPlayer, session, server, reachableTiles);
            }
        }, delay);
    }

    // We make sure the name is not choosen by another character
    private getRandomName(existingNames: string[]): string {
        let name: string;
        do {
            name = this.nameList[Math.floor(Math.random() * this.nameList.length)];
        } while (existingNames.includes(name));
        return name;
    }

    private getRandomCharacter(takenCharacters: string[]): string {
        const availableCharacters = this.allCharacters.filter((character) => !takenCharacters.includes(character));
        return availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
    }

    private generateRandomAttributes(): Attributes {
        const highPoints = 6;
        const lowPoints = 4;
        const halfChance = 0.5;
        const lifePoints = Math.random() < halfChance ? lowPoints : highPoints;
        const speedPoints = lifePoints === lowPoints ? highPoints : lowPoints;
        const offensePoints = 4;
        const defensePoints = 4;
        const diceChoice = Math.random() < halfChance ? 'attack' : 'defense';

        return {
            lifePoints,
            currentHP: lifePoints,
            speedPoints,
            currentSpeed: speedPoints,
            offensePoints,
            defensePoints,
            diceChoice,
            actionLeft: 1,
        };
    }

    private generateSocketId(): string {
        const toStringSize = 36;
        const sliceSize = 11;
        return 'virtual_' + Math.random().toString(toStringSize).slice(2, sliceSize);
    }

    private async agressiveBehavior(virtualPlayer: Player, session: ActiveSession, server: Server, reachableTiles: [number, number][]) {
        const room = session.room;

        // Check for reachable players first
        const reachablePlayer = this.findReachablePlayer(virtualPlayer, session, reachableTiles);
        if (reachablePlayer && this.turnService.hasTurn(session, virtualPlayer.socketId)) {
            const startedCombat = await this.moveToAttackPlayer(reachableTiles, virtualPlayer, reachablePlayer, session, server);
            if (startedCombat) return;
        }

        // then we check for reachable offensive items
        const offensiveItemTile = this.findTileWithOffensiveItem(reachableTiles, room.map._tiles);
        if (offensiveItemTile && this.turnService.hasTurn(session, virtualPlayer.socketId)) {
            await this.pickUpItem(virtualPlayer, offensiveItemTile, session, server);
            await this.playerMovementService.wait150Ms();
        }

        // if no reachable player nor item we move closer to either a player or an offensive item
        const allTargets: [number, number][] = [
            ...room.players
                .filter((player) => player.position && player !== virtualPlayer)
                .map((player) => [player.position.x, player.position.y] as [number, number]),
            ...this.getAllOffensiveItems(room.map._tiles),
        ];

        const closestTarget = this.getClosestTarget([virtualPlayer.position.x, virtualPlayer.position.y], allTargets);
        if (closestTarget && this.turnService.hasTurn(session, virtualPlayer.socketId)) {
            await this.moveCloserToTarget(virtualPlayer, closestTarget, session, server);
            await this.playerMovementService.wait150Ms();
        }
        if (this.turnService.hasTurn(session, virtualPlayer.socketId)) {
            reachableTiles = this.tileValidityService.getReachableTiles(session.room.map, virtualPlayer);
            this.randomMovement(reachableTiles, virtualPlayer, session, server);
        }
    }

    private async defensiveBehavior(virtualPlayer: Player, session: ActiveSession, server: Server, reachableTiles: [number, number][]) {
        const deffensiveItemTile = this.findTileWithDefensiveItem(reachableTiles, session.room.map._tiles);
        if (deffensiveItemTile && this.turnService.hasTurn(session, virtualPlayer.socketId)) {
            await this.pickUpItem(virtualPlayer, deffensiveItemTile, session, server);
            await this.playerMovementService.wait150Ms();
        }
        const allTargets: [number, number][] = this.getAllOffensiveItems(session.room.map._tiles);
        const closestTarget = this.getClosestTarget([virtualPlayer.position.x, virtualPlayer.position.y], allTargets);
        if (closestTarget && this.turnService.hasTurn(session, virtualPlayer.socketId)) {
            await this.moveCloserToTarget(virtualPlayer, closestTarget, session, server);
            await this.playerMovementService.wait150Ms();
        }

        if (this.turnService.hasTurn(session, virtualPlayer.socketId)) {
            reachableTiles = this.tileValidityService.getReachableTiles(session.room.map, virtualPlayer);
            this.randomMovement(reachableTiles, virtualPlayer, session, server);
        }
    }

    private async moveCloserToTarget(virtualPlayer: Player, closestTarget: [number, number], session: ActiveSession, server: Server) {
        const pathToTarget = this.findPathToClosestReachableTile(virtualPlayer, closestTarget, session.room.map);
        if (pathToTarget) {
            await this.playerMovementService.movePlayer(virtualPlayer.socketId, session, pathToTarget, server);
        }
    }

    private findReachablePlayer(virtualPlayer: Player, session: ActiveSession, reachableTiles: [number, number][]): Player | undefined {
        return session.room.players.find(
            (player) =>
                player.socketId !== virtualPlayer.socketId &&
                this.tileValidityService
                    .getAdjacentTiles(player.position, session.room.map._tiles)
                    .some(([x, y]) => reachableTiles.some(([rx, ry]) => rx === x && ry === y)),
        );
    }

    private async moveToAttackPlayer(
        reachableTiles: [number, number][],
        virtualPlayer: Player,
        reachablePlayer: Player,
        session: ActiveSession,
        server: Server,
    ): Promise<boolean> {
        const targetTile = reachableTiles.find(([x, y]) =>
            this.tileValidityService.getAdjacentTiles(reachablePlayer.position, session.room.map._tiles).some(([ax, ay]) => x === ax && y === ay),
        );
        const pathToPlayer = this.tileValidityService.findPath(virtualPlayer, targetTile, session.room.map._tiles);
        if (pathToPlayer) {
            await this.playerMovementService.movePlayer(virtualPlayer.socketId, session, pathToPlayer, server);
            if (this.tileValidityService.isAdjascent(virtualPlayer, reachablePlayer.position)) {
                this.combatService.beginCombat(session, virtualPlayer.socketId, reachablePlayer.userName, server);
                return true;
            }
        }
        return false;
    }

    private getAllOffensiveItems(tiles: Tile[][]): [number, number][] {
        const items: [number, number][] = [];
        tiles.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (tile.item && this.offensiveItems.includes(tile.item.itemType)) {
                    items.push([x, y]);
                }
            });
        });
        return items;
    }

    private getClosestTarget(start: [number, number], targets: [number, number][]): [number, number] | undefined {
        return targets.reduce(
            (closest, current) => {
                const currentDistance = Math.abs(current[0] - start[0]) + Math.abs(current[1] - start[1]);
                const closestDistance = closest ? Math.abs(closest[0] - start[0]) + Math.abs(closest[1] - start[1]) : Infinity;
                return currentDistance < closestDistance ? current : closest;
            },
            undefined as [number, number] | undefined,
        );
    }

    private async pickUpItem(virtualPlayer: Player, itemTile: [number, number], session: ActiveSession, server: Server) {
        const pathToItem = this.tileValidityService.findPath(virtualPlayer, itemTile, session.room.map._tiles);
        if (pathToItem) {
            await this.playerMovementService.movePlayer(virtualPlayer.socketId, session, pathToItem, server);
        }
    }

    private findTileWithDefensiveItem(reachableTiles: [number, number][], tiles: Tile[][]): [number, number] | undefined {
        const defensiveTile = reachableTiles.find(([x, y]) => {
            const tile = tiles[y]?.[x];
            if (!tile || !tile.item) return false;
            return this.defensiveItems.includes(tile.item.itemType);
        });
        return defensiveTile;
    }

    private findTileWithOffensiveItem(reachableTiles: [number, number][], tiles: Tile[][]): [number, number] | undefined {
        const offensiveTile = reachableTiles.find(([x, y]) => {
            const tile = tiles[y]?.[x];
            if (!tile || !tile.item) return false;
            return this.offensiveItems.includes(tile.item.itemType);
        });
        return offensiveTile;
    }

    private findPathToClosestReachableTile(player: Player, targetTile: [number, number], map: Map): [number, number][] {
        const reachableTiles = this.tileValidityService.getReachableTiles(map, player);
        if (reachableTiles.length === 0) {
            return [];
        }
        // Manhattan distance to find closest reachable Tile
        const closestReachableTile = reachableTiles.reduce((closest, current) => {
            const currentDistance = Math.abs(current[0] - targetTile[0]) + Math.abs(current[1] - targetTile[1]);
            const closestDistance = Math.abs(closest[0] - targetTile[0]) + Math.abs(closest[1] - targetTile[1]);
            return currentDistance < closestDistance ? current : closest;
        });
        const path = this.tileValidityService.findPath(player, closestReachableTile, map._tiles);
        return path;
    }

    private async randomMovement(reachableTiles: [number, number][], virtualPlayer: Player, session: ActiveSession, server: Server) {
        const targetTile = reachableTiles[Math.floor(Math.random() * reachableTiles.length)];
        if (targetTile && this.turnService.hasTurn(session, virtualPlayer.socketId)) {
            const path = this.tileValidityService.findPath(virtualPlayer, targetTile, session.room.map._tiles);
            if (path) {
                await this.playerMovementService.movePlayer(virtualPlayer.socketId, session, path, server);
            }
        }
        if (this.turnService.hasTurn(session, virtualPlayer.socketId)) {
            this.turnService.endTurn(session, server);
        }
    }
}
