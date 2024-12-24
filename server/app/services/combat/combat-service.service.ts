import { ActiveSession } from '@app/interfaces/active-session';
import { ActionsService } from '@app/services/actions/actions.service';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { GameTimerService } from '@app/services/game-timer/game-timer.service';
import { TileValidityService } from '@app/services/tile-validity/tile-validity.service';
import { TurnService } from '@app/services/turn/turn.service';
import { CONSTANTS } from '@common/constants';
import { directions } from '@common/directions';
import { CombatEvents } from '@common/event-enums/combat.gateway.events';
import { GameLogicEvents } from '@common/event-enums/gameLogic.gateway.events';
import { AttackResult } from '@common/interfaces/attack-result';
import { DiceChoice } from '@common/interfaces/attributes';
import { Combat, CombatMove } from '@common/interfaces/combat';
import { Map } from '@common/interfaces/map';
import { Player } from '@common/interfaces/player';
import { Position } from '@common/interfaces/position';
import { Tile } from '@common/interfaces/tile';
import { TileEnum } from '@common/tile-enum';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class CombatService {
    constructor(
        private timerService: GameTimerService,
        private turnService: TurnService,
        private infoService: GameInfoService,
        private actionsService: ActionsService,
        private tileValidityService: TileValidityService,
    ) {}

    // Generates a new instance of Combat holding references to both participating players
    // Assigns turn either to speed or, if equal, to random chance.
    generateCombat(player1: Player, player2: Player, session: ActiveSession) {
        session.combatTimer = this.timerService.createTimer(CONSTANTS.COMBAT_SECONDS_LENGTH, CONSTANTS.MS_TO_SECONDS_CONVERSION);
        const player1OnIce = this.getPlayerIsOnIce(player1, session);
        const player2OnIce = this.getPlayerIsOnIce(player2, session);
        if (player2.attributes.speedPoints > player1.attributes.speedPoints) {
            session.combat = {
                attacker: { player: player2, runAttempts: 0, onIce: player2OnIce },
                defender: { player: player1, runAttempts: 0, onIce: player1OnIce },
                locked: false,
            };
        } else {
            session.combat = {
                attacker: { player: player1, runAttempts: 0, onIce: player1OnIce },
                defender: { player: player2, runAttempts: 0, onIce: player2OnIce },
                locked: false,
            };
        }
    }

    // Starts an attack according to turn, checks if defender lost or has died
    // either attributes victor to combat or sets up next attack turn.
    startAttack(combat: Combat, server: Server, roomCode: string, debugMode: boolean): void {
        combat.attackResult = this.attack(combat, debugMode);
        const attackLog = this.infoService.createLog(
            `${this.getAttackerPlayer(combat).userName} attaque ${this.getDefenderPlayer(combat).userName} avec un jet d'attaque de 
            ${combat.attackResult.attackRoll} contre ${combat.attackResult.defenseRoll} en défense.`,
            [this.getAttackerPlayer(combat).socketId, this.getDefenderPlayer(combat).socketId],
            roomCode,
        );
        this.infoService.sendToCertainPlayers(server, attackLog, [combat.attacker.player.socketId, combat.defender.player.socketId]);
        if (combat.attackResult.success) {
            this.getDefenderPlayer(combat).attributes.currentHP--;
            this.infoService.incrementHealthInflicted(roomCode, combat.attacker.player.socketId, 1);
            this.infoService.incrementHealthLost(roomCode, combat.defender.player.socketId, 1);
            const successLog = this.infoService.createLog(
                `${this.getDefenderPlayer(combat).userName} subit des dégâts!`,
                [this.getAttackerPlayer(combat).socketId, this.getDefenderPlayer(combat).socketId],
                roomCode,
            );
            this.infoService.sendToCertainPlayers(server, successLog, [combat.attacker.player.socketId, combat.defender.player.socketId]);
        }
        if (this.getDefenderPlayer(combat).attributes.currentHP <= 0) {
            combat.victor = this.getAttackerPlayer(combat);
            combat.victor.nbWins++;
            combat.loser = this.getDefenderPlayer(combat);
            this.infoService.incrementVictories(roomCode, combat.attacker.player.socketId);
            this.infoService.incrementDefeats(roomCode, combat.defender.player.socketId);
        }
    }

    // Picks the bonus dice for both players, rolls them and calculates the sucess
    // Places this in an AttackResult object
    attack(combat: Combat, debugMode: boolean): AttackResult {
        const attackerDiceSize = this.determineDiceChoice(combat, 'attack');
        const defenderDiceSize = this.determineDiceChoice(combat, 'defense');
        let attackRoll: number;
        let defenseRoll: number;
        const attackItemBonus = this.actionsService.getAttackBonus(combat.attacker.player);
        const defenseItemBonus = this.actionsService.getDefenseBonus(combat.attacker.player, combat.defender.player);

        if (debugMode) {
            attackRoll = attackerDiceSize * attackItemBonus + this.getAttackerPlayer(combat).attributes.offensePoints;
            defenseRoll = 1 * defenseItemBonus + this.getDefenderPlayer(combat).attributes.defensePoints;
        } else {
            attackRoll = this.rollXD(attackerDiceSize) * attackItemBonus + this.getAttackerPlayer(combat).attributes.offensePoints;
            defenseRoll = this.rollXD(defenderDiceSize) * defenseItemBonus + this.getDefenderPlayer(combat).attributes.defensePoints;
        }

        if (combat.attacker.onIce) attackRoll -= 2;
        if (combat.defender.onIce) defenseRoll -= 2;

        return {
            attackRoll,
            defenseRoll,
            success: attackRoll > defenseRoll,
        };
    }

    doMove(session: ActiveSession, move: CombatMove, server: Server): void {
        this.timerService.stopTimer(session.combatTimer);
        if (move === 'attack') {
            this.startAttack(session.combat, server, session.room.code, session.debugMode);
        } else if (move === 'run') {
            this.tryRun(session.combat, server, session);
        }
    }

    tryRun(combat: Combat, server: Server, session: ActiveSession): void {
        const chance = 0.4;
        const success = Math.random() < chance;
        combat.escaped = success;
        if (!success) combat.attacker.runAttempts++;
        else {
            this.infoService.incrementEscapes(session.room.code, combat.attacker.player.socketId);
        }
        const escapeLog = this.infoService.createLog(
            `${combat.attacker.player.userName} tente de s'évader, ${success ? 'réussite' : 'échec'}.`,
            [combat.attacker.player.socketId, combat.defender.player.socketId],
            session.room.code,
        );
        this.infoService.sendToCertainPlayers(server, escapeLog, [combat.attacker.player.socketId, combat.defender.player.socketId]);
    }

    setNextTurn(combat: Combat): void {
        if (combat && combat.attacker && combat.defender) {
            const tempAttacker = combat.attacker;
            combat.attacker = combat.defender;
            combat.defender = tempAttacker;
        }
    }

    readyCombatTurn(server: Server, session: ActiveSession) {
        if (!session.combat) return;
        const onCombatSecond = (count: number) => server.to(session.room.code).emit(CombatEvents.CombatClock, count);
        const onCombatTurnExpire = () => {
            this.combatMove(session, server, 'attack');
        };
        session.combatTimer.count =
            session.combat.attacker.runAttempts < 2 ? CONSTANTS.COMBAT_SECONDS_LENGTH : CONSTANTS.COMBAT_NO_RUN_SECONDS_LENGTH;
        setTimeout(() => {
            this.startCombatTurn(session, server, onCombatSecond, onCombatTurnExpire);
            if (session.combat?.attacker?.player.isVirtual) {
                this.handleVirtualPlayerCombat(session, server);
            }
        }, CONSTANTS.COMBAT_TURN_DELAY);
    }

    beginCombat(session: ActiveSession, initiaterId: string, victimUserName: string, server: Server) {
        const initiater = session.room.players.find((player: Player) => player.socketId === initiaterId);
        const victim = session.room.players.find((player: Player) => player.userName === victimUserName);
        if (!victim || !initiater || initiater === victim) return;
        this.infoService.incrementCombats(session.room.code, initiater.socketId);
        this.infoService.incrementCombats(session.room.code, victim.socketId);
        if (this.actionsService.playerCanDoAction(initiater, session) && this.tileValidityService.isAdjascent(initiater, victim.position)) {
            this.turnService.pauseTurn(session);
            initiater.hasActed = true;
            this.generateCombat(initiater, victim, session);
            server.to(session.room.code).emit(CombatEvents.StartCombat, session.combat);
            this.infoService.beginCombatLog(initiater, victim, session.room.code, server);
            this.readyCombatTurn(server, session);
        }
    }

    combatMove(session: ActiveSession, server: Server, move: CombatMove) {
        if (!session.combat || session.combat.locked) {
            return;
        }
        if (move === 'run') {
            const attacker = session.combat.attacker;
            if (!this.canRun(attacker.player, attacker.runAttempts)) return;
        }

        session.combat.attackResult = undefined;
        session.combat.locked = true;
        this.doMove(session, move, server);

        if (session.combat.victor !== undefined || session.combat.escaped) {
            this.handleCombatEnd(server, session);
        } else {
            if (move === 'run') server.to(session.room.code).emit(CombatEvents.RunFailed, session.combat);
            else if (move === 'attack') server.to(session.room.code).emit(CombatEvents.AttackResult, session.combat);
            this.setNextTurn(session.combat);
            this.readyCombatTurn(server, session);
        }
    }

    handleCombatEnd(server: Server, session: ActiveSession, quitter?: Player) {
        const combat = session.combat;
        if (combat.victor) {
            this.actionsService.handleCombatEnd(combat.loser, session, server);
            this.playerWon(session, combat, server);
        } else if (combat.escaped) {
            this.playerEscaped(session, combat, server);
        } else if (quitter) {
            this.playerQuit(session, combat, quitter, server);
        }
        this.getAttackerPlayer(combat).attributes.currentHP = this.getAttackerPlayer(combat).attributes.lifePoints;
        this.getDefenderPlayer(combat).attributes.currentHP = this.getDefenderPlayer(combat).attributes.lifePoints;
        session.combat = undefined;
    }

    leaveRoom(player: Player, session: ActiveSession, server: Server) {
        if (session.combat) {
            if (session.combat.attacker.player.socketId === player.socketId || session.combat.defender.player.socketId === player.socketId) {
                this.handleCombatEnd(server, session, player);
            }
        }
    }

    handleVirtualPlayerCombat(session: ActiveSession, server: Server): void {
        const combat = session.combat;
        const attacker = this.getAttackerPlayer(combat);

        const delay = Math.random() * CONSTANTS.COMBAT_TURN_DELAY;
        setTimeout(() => {
            if (attacker.isAgressive) {
                // Agressive behavior => always attack
                this.combatMove(session, server, 'attack');
            } else {
                // Defensive behavior => try to run if injured
                const injured = attacker.attributes.currentHP < attacker.attributes.lifePoints;
                if (injured) {
                    this.combatMove(session, server, 'run');
                } else {
                    this.combatMove(session, server, 'attack');
                }
            }
        }, delay);
    }

    // Using a "expanding square pattern" inspired by this article:
    // https://www.weems-plath.com/core/media/media.nl/id.318095/c.449809/.f?h=779e550dcfa99d3e4fdb
    respawnPlayer(player: Player, map: Map, roomId: string, server: Server) {
        const posInit = player.startPosition;
        if (!posInit) return;
        if (player.position.x === posInit.x && player.position.y === posInit.y) return;
        const respawnPos: Position = { x: posInit.x, y: posInit.y };
        this.findRespawnPosition(respawnPos, map._tiles);
        if (player.position.x >= 0 && player.position.y >= 0) {
            map._tiles[player.position.y][player.position.x].player = undefined;
        }
        player.position = respawnPos;
        map._tiles[respawnPos.y][respawnPos.x].player = player;
        server.to(roomId).emit(GameLogicEvents.UpdateMap, map);
        server.to(player.socketId).emit(GameLogicEvents.UpdatePlayerPos, player.position);
    }

    findRespawnPosition(pos: Position, grid: Tile[][]) {
        let found: boolean = this.tileValidityService.isValidTile(grid, pos.x, pos.y);
        let layer = 1;
        const maxLayer = 5;
        if (!found) pos = { x: pos.x - 1, y: pos.y - 1 }; // up and to the left, so when we go down twice were in the search pattern
        while (!found) {
            const steps = layer * 2;
            for (const [dx, dy] of directions) {
                for (let i = 0; i < steps; i++) {
                    pos.x += dx;
                    pos.y += dy;
                    if (this.tileValidityService.isValidTile(grid, pos.x, pos.y)) {
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (!found) {
                layer++;
                pos.x -= 1;
                pos.y -= 1; // go up and left to reset next layer
            }
            if (layer > maxLayer) return; // Should never happen but just a infinite loop test
        }
    }

    private canRun(attacker: Player, runAttempts: number): boolean {
        const hasChip = this.actionsService.hasChipItem(attacker);
        const withChip = hasChip && runAttempts < CONSTANTS.MAX_RUNS_CHIP;
        const noChip = !hasChip && runAttempts < CONSTANTS.MAX_RUNS;
        return withChip || noChip;
    }

    private getPlayerIsOnIce(player: Player, session: ActiveSession): boolean {
        return session.room.map._tiles[player.position.y][player.position.x]._tileType === TileEnum.Ice;
    }

    private getAttackerPlayer(combat: Combat): Player {
        return combat.attacker.player;
    }

    private getDefenderPlayer(combat: Combat): Player {
        return combat.defender.player;
    }

    private playerEscaped(session: ActiveSession, combat: Combat, server: Server) {
        server.to(session.room.code).emit(CombatEvents.CombatResult);
        setTimeout(() => {
            server.to(session.room.code).emit(CombatEvents.CombatEnded);
            const defender = this.getDefenderPlayer(combat);
            if (defender.isVirtual && this.turnService.hasTurn(session, defender.socketId)) {
                this.turnService.endTurn(session, session.server);
            } else if (this.actionsService.playerHasNearbyAction(this.getAttackerPlayer(combat), session.room.map._tiles))
                this.turnService.continueTurn(session, server);
            else this.turnService.startNextTurn(session, server);
        }, CONSTANTS.COMBAT_END_DURATION);
    }

    private playerQuit(session: ActiveSession, combat: Combat, quitter: Player, server: Server) {
        server.to(session.room.code).emit(CombatEvents.CombatAborted);
        const victor = quitter === combat.attacker.player ? combat.defender.player : combat.attacker.player;
        victor.nbWins++;
        setTimeout(() => {
            this.turnService.continueTurn(session, server);
        }, CONSTANTS.COMBAT_END_DURATION);
    }

    private playerWon(session: ActiveSession, combat: Combat, server: Server) {
        const victor = combat.attacker.player;
        server.to(session.room.code).emit(CombatEvents.CombatResult, victor);
        const logMessage = this.infoService.createLog(`${victor.userName} a gagné le combat.`, [victor.socketId], session.room.code);
        this.infoService.sendToAllPlayers(server, logMessage, session.room.code);

        if (victor.nbWins >= CONSTANTS.CLASSIC_MAX_WINS) {
            this.turnService.stopGame(session, server, victor);
        } else {
            setTimeout(() => {
                server.to(session.room.code).emit(CombatEvents.CombatEnded);
                this.respawnPlayer(combat.defender.player, session.room.map, session.room.code, server);
                const map = session.room.map;
                if (victor.isVirtual) {
                    this.turnService.endTurn(session, server);
                } else if (
                    victor === session.room.players[session.turnIndex] &&
                    map &&
                    this.actionsService.playerHasNearbyAction(victor, map._tiles)
                ) {
                    this.turnService.continueTurn(session, server);
                } else {
                    this.turnService.startNextTurn(session, server);
                }
            }, CONSTANTS.COMBAT_END_DURATION);
        }
    }

    // Rolls an X sided dice
    private rollXD(x: number): number {
        return Math.floor(Math.random() * x) + 1;
    }

    private determineDiceChoice(combat: Combat, choice: DiceChoice): number {
        return combat.attacker.player.attributes.diceChoice === choice ? CONSTANTS.DICE_6 : CONSTANTS.DICE_4;
    }

    private startCombatTurn(session: ActiveSession, server: Server, onTimerSecond: (count: number) => void, onExpire: () => void) {
        if (session.combat && session.combat.attacker.player && session.combat.defender.player) {
            this.timerService.startTimer(session.combatTimer, onTimerSecond, onExpire);
            const attacker = session.combat.attacker.player;
            const defender = session.combat.defender.player;
            this.infoService.createCombatTurnLog(attacker, defender, session.room.code, server);
            server.to(session.room.code).emit(CombatEvents.NextCombatTurn, session.combat);
            server.to(this.getAttackerPlayer(session.combat).socketId).emit(CombatEvents.YourAttack);
            server.to(this.getDefenderPlayer(session.combat).socketId).emit(CombatEvents.YourDefense);
            session.combat.locked = false;
        }
    }
}
