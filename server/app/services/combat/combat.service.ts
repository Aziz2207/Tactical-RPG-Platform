import {
  DEFAULT_COMBAT_RESULT,
  DISCONNECTED_POSITION,
  END_COMBAT_DELAY,
  EVASION_SUCCESS_RATE,
  FIGHT_TIME,
  ICE_TILE_PENALTY_VALUE,
  LogType,
  MIN_DICE_VALUE,
  NO_EVASION_TIME,
  ROLL_DURATION,
  SINGLE_PLAYER,
  TWO_BOTS_FIGHT_TIME,
  VICTORIES,
  XIPHOS_ATTACK_BONUS,
  XIPHOS_DEFENSE_PENALTY,
} from "@app/constants";
import { GameLogsService } from "@app/services/game-logs/game-logs.service";
import { GameService } from "@app/services/game/game.service";
import { ObjectType } from "@common/avatars-info";
import { GameMode, TileType, XiphosEffect } from "@common/constants";
import { CombatInfos, CombatPlayers } from "@common/interfaces/combat-info";
import { Game } from "@common/interfaces/game";
import { Behavior, Player, Position, Status } from "@common/interfaces/player";
import { PlayerStatType } from "@common/interfaces/post-game-stat";
import { Room } from "@common/interfaces/room";
import { ActionData } from "@common/interfaces/socket-data.interface";
import { ServerToClientEvent } from "@common/socket.events";
import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";

/* eslint-disable max-lines */
@Injectable()
export class CombatService {
  combatInfos = new Map<string, CombatInfos>();

  constructor(
    private gameService: GameService,
    private logService: GameLogsService
  ) {}

  startFight(room: Room, combatActionData: ActionData) {
    const combatInfos = this.initializeCombatInfos(combatActionData, room);
    if (!combatInfos) return;
    const combatPlayers = combatInfos.combatPlayers;
    this.logService.sendGlobalCombatLog(
      room.roomId,
      this.getServer(),
      combatPlayers,
      LogType.StartCombat
    );
    this.gameService.getTurnTimer(room.roomId).pauseTimer();
    const isActivePlayerAttacker = this.isAttacker(
      combatActionData.player,
      combatPlayers
    );
    this.emitToCombatPlayers(combatPlayers, ServerToClientEvent.StartFight, {
      combatPlayers,
      isActivePlayerAttacker,
    }, room.roomId);
    this.emitEventToRoom(room.roomId, ServerToClientEvent.CombatInProgress);
    this.onStartTurn(room);
  }

  attackPlayer(room: Room) {
    const combatInfos = this.combatInfos.get(room.roomId);
    if (!combatInfos) {
      return;
    }
    const combatPlayers = combatInfos.combatPlayers;
    const debugMode = room.isDebug;
    const { attackValues, defenseValues } = this.getCombatValues(
      combatPlayers,
      debugMode
    );
    this.emitToCombatPlayers(
      combatPlayers,
      ServerToClientEvent.AttackValues,
      {
        attackValues,
        defenseValues,
      },
      room.roomId
    );
    const damageDealt = Math.abs(attackValues.total - defenseValues.total);
    if (attackValues.total > defenseValues.total) {
      this.handleAttackSuccess(combatPlayers, room, damageDealt);
    } else {
      this.handleFailAttack(combatPlayers, room, damageDealt);
    }
    this.logService.sendCombatResultLog(
      room.roomId,
      this.getServer(),
      combatPlayers
    );
    this.checkCombatOutcome(room, combatPlayers);
  }

    evadingPlayer(room: Room, evaderId?: string) {
        const combatInfos = this.combatInfos.get(room.roomId);
        if (!combatInfos) {
            return;
        }
        const combatPlayers = combatInfos.combatPlayers;
        combatPlayers.attacker.attributes.evasion--;
        if (this.isEvasionSuccessful()) {
            this.handleEvasionSuccess(room, evaderId);
        } else {
            this.logService.sendCombatActionLog(
                room.roomId,
                this.getServer(),
                combatPlayers,
                LogType.EvadeCombatFail
            );
            this.emitToCombatPlayers(
                combatPlayers,
                ServerToClientEvent.EvasionFail,
                combatPlayers.attacker,
                room.roomId
            );
            combatInfos.failEvasion = true;
            this.onEndTurn(room);
        }
    }

  handleDisconnectedPlayer(client: Socket, room: Room) {
    const isInCombat = this.isInCombat(client);
    if (isInCombat) this.manageCombatPlayerDisconnection(client, room);
    this.gameService.leavePlayerFromGame(room.roomId, client);
    if (isInCombat) this.gameService.updatePlayerRecordAfterDisconnectionDuringCombat(room.roomId, client.data.userId);
    if (!this.getServer().sockets.adapter.rooms.get(room.roomId)) {
      this.gameService.stopGameTimers(room);
    }
  }

  private manageCombatPlayerDisconnection(client: Socket, room: Room) {
    const winner = this.getOpponent(client);
        this.consumeCombatAction(room);
    this.resetCombatState(room);
    if (!this.hasValidActivePlayers(room)) return;
    this.logService.sendPlayerLog(
      room.roomId,
      this.getServer(),
      winner,
      LogType.WinCombat
    );
    this.handleDefaultCombatWin(room, winner);
    if (winner.isActive) {
      this.continuePlayerTurn(room);
    }
  }

  private isInCombat(client: Socket) {
    if (!this.combatInfos.has(client.data?.roomCode)) return false;
    const combatPlayers = this.combatInfos.get(
      client.data.roomCode
    ).combatPlayers;
    return (
      client.data.userId === combatPlayers.attacker?.uid ||
      client.data.userId === combatPlayers.defender?.uid
    );
  }

  private getServer() {
    return this.gameService.getServer();
  }

    private emitToCombatPlayers(players: CombatPlayers, event: string, data?, roomId?: string) {
        if (roomId) {
            this.gameService.emitEventToRoom(roomId, event, data);
            return;
        }

        this.getServer().to(players.attacker.id).emit(event, data);
        this.getServer().to(players.defender.id).emit(event, data);
    }

    syncWithCombat(roomId: string, client: Socket) {
        const combatInfos = this.combatInfos.get(roomId);
        if (!combatInfos) return;

        const { combatPlayers, room } = combatInfos;
        const activePlayer = room.listPlayers.find((player) => player.isActive);
        const isActivePlayerAttacker = activePlayer
            ? combatPlayers.attacker.id === activePlayer.id
            : true;

        client.emit(ServerToClientEvent.StartFight, {
            combatPlayers,
            isActivePlayerAttacker,
        });
        client.emit(ServerToClientEvent.CombatInProgress);

        const fightTimer = this.gameService.getFightTimer(roomId);
        const timeRemaining = fightTimer?.getTimeRemaining?.();
        if (typeof timeRemaining === "number") {
            client.emit(ServerToClientEvent.CombatTime, timeRemaining);
        }
    }

  private emitEventToRoom(roomId: string, event: string, data?) {
    this.gameService.emitEventToRoom(roomId, event, data);
  }

  private onStartTurn(room: Room) {
    const combatInfos = this.combatInfos.get(room.roomId);
    if (!combatInfos) {
      return;
    }
    const combatPlayers = combatInfos.combatPlayers;
    if (this.isDefensiveBotDamaged(combatPlayers.attacker)) {
      this.evadingPlayer(room);
      return;
    }
    if (!combatInfos.checkedXiphos) {
      this.checkXiphos(combatInfos.combatPlayers, room);
    }
    this.setFightTimer(room, combatPlayers);
  }

    private setFightTimer(room: Room, combatPlayers: CombatPlayers) {
      const turnTime = this.getTurnTime(combatPlayers);
      this.gameService
        .getFightTimer(room.roomId)
        .resetTimer(turnTime, (timeRemaining: number) => {
          this.emitToCombatPlayers(
            combatPlayers,
            ServerToClientEvent.CombatTime,
            timeRemaining,
            room.roomId
          );
          if (timeRemaining <= 0) {
            this.attackPlayer(room);
          }
          if (this.canBotAttack(turnTime, timeRemaining, combatPlayers)) {
            this.attackPlayer(room);
            return;
          }
        });
    }

    private onEndTurn(room: Room) {
        const combatInfos = this.combatInfos.get(room.roomId);
        if (!combatInfos) {
            return;
        }
        const combatPlayers = combatInfos.combatPlayers;
        [combatPlayers.attacker, combatPlayers.defender] = [
            combatPlayers.defender,
            combatPlayers.attacker,
        ];
        this.emitToCombatPlayers(
            combatPlayers,
            ServerToClientEvent.CombatTurnEnded,
            { combatPlayers, failEvasion: combatInfos.failEvasion },
            room.roomId
        );
        combatInfos.failEvasion = false;
        this.onStartTurn(room);
    }

  private getCombatValues(combatPlayers: CombatPlayers, debugMode: boolean) {
    const { attacker, defender } = combatPlayers;
    const attackDiceValue = debugMode
      ? attacker.attributes.atkDiceMax
      : this.getRandomValue(attacker.attributes.atkDiceMax);
    const attackValues = {
      total: attacker.attributes.attack + attackDiceValue,
      diceValue: attackDiceValue,
    };
    const defenseDiceValue = debugMode
      ? MIN_DICE_VALUE
      : this.getRandomValue(defender.attributes.defDiceMax);
    const defenseValues = {
      total: defender.attributes.defense + defenseDiceValue,
      diceValue: defenseDiceValue,
    };
    combatPlayers.combatResultDetails = { attackValues, defenseValues };
    return { attackValues, defenseValues };
  }

  private handleEvasionSuccess(room: Room, evaderId: string) {
        this.consumeCombatAction(room); 
    const combatInfos = this.combatInfos.get(room.roomId);
    const combatPlayers = combatInfos.combatPlayers;
    this.logService.sendCombatActionLog(
      room.roomId,
      this.getServer(),
      combatPlayers,
      LogType.EvadeCombatSuccess
    );
    this.logService.sendGlobalCombatLog(
      room.roomId,
      this.getServer(),
      combatPlayers,
      LogType.NoWinnerCombat
    );
    this.emitToCombatPlayers(
      combatPlayers,
      ServerToClientEvent.EvasionSuccess,
      {
        listPlayers: room.listPlayers,
        player: combatPlayers.attacker,
      }
    );
    this.addEvadeToPostGameStats(evaderId, room);
    this.addToPostGameStats(
      room,
      combatPlayers,
      PlayerStatType.Draws,
      PlayerStatType.Draws
    );
    this.addToPostGameStats(
      room,
      combatPlayers,
      PlayerStatType.Combats,
      PlayerStatType.Combats
    );
    this.emitEventToRoom(room.roomId, ServerToClientEvent.CombatOver);
    this.continuePlayerTurn(room);
    this.resetCombatState(room);
    this.combatInfos.delete(room.roomId);
  }

  private handleCombatWon(winner: Player, room: Room) {
    const combatInfos = this.combatInfos.get(room.roomId);
    if (!combatInfos) {
      return;
    }
    const combatPlayers = combatInfos.combatPlayers;
    const isWinnerAttacker = this.isAttacker(winner, combatPlayers);
    this.resetCombatState(room);
    this.logService.sendPlayerLog(
      room.roomId,
      this.getServer(),
      winner,
      LogType.WinCombat
    );
    this.addVictory(combatPlayers, room, isWinnerAttacker);
    this.combatInfos.delete(room.roomId);
    this.emitEventToRoom(room.roomId, ServerToClientEvent.CombatOver);
  }

  private continuePlayerTurn(room: Room) {
    setTimeout(() => {
      this.gameService
        .getTurnTimer(room.roomId)
        .resumeTimer((timeRemaining) => {
          if (timeRemaining <= 0) {
            this.gameService.onTurnEnded(room);
          }
          this.emitEventToRoom(
            room.roomId,
            ServerToClientEvent.StartedTurnTimer,
            timeRemaining
          );
        });
    }, END_COMBAT_DELAY);
  }

  private handleTurnAfterCombat(winner: Player, room: Room) {
    const activePlayer = this.gameService.getActivePlayer(room);
    if (activePlayer.uid === winner.uid) {
      this.handleWinnerTurn(winner, room);
    } else {
      setTimeout(() => {
        this.gameService.onTurnEnded(room);
      }, END_COMBAT_DELAY);
    }
  }

  private handleAttackSuccess(
    combatPlayers: CombatPlayers,
    room: Room,
    damageDealt: number
  ) {
    combatPlayers.defender.attributes.currentHp -= damageDealt;
    this.addToPostGameStats(
      room,
      combatPlayers,
      PlayerStatType.DamageDealt,
      PlayerStatType.DamageTaken,
      damageDealt
    );
    this.emitToCombatPlayers(combatPlayers, ServerToClientEvent.AttackSuccess, {
      attacker: combatPlayers.attacker,
      damage: damageDealt
    },
      room.roomId);
    this.logService.sendCombatActionLog(
      room.roomId,
      this.getServer(),
      combatPlayers,
      LogType.AttackSuccess
    );
  }

  private handleFailAttack(
    combatPlayers: CombatPlayers,
    room: Room,
    damageDealt: number
  ) {
    const shouldDamageSelf = this.checkAchillesArmor(
      combatPlayers.attacker,
      damageDealt
    );
    this.emitToCombatPlayers(combatPlayers, ServerToClientEvent.AttackFail, {
      attacker: combatPlayers.attacker,
      shouldDamageSelf,
      damage: damageDealt,
    }, room.roomId);
    this.logService.sendCombatActionLog(
      room.roomId,
      this.getServer(),
      combatPlayers,
      LogType.AttackFail
    );
  }

  private handleWinnerTurn(winner: Player, room: Room) {
    if (this.isPlayerBot(winner)) {
      this.gameService.onTurnEnded(room);
    } else {
      this.continuePlayerTurn(room);
      const reachability = room.navigation.findReachableTiles(winner, room);
      this.emitEventToRoom(
        room.roomId,
        ServerToClientEvent.ReachableTiles,
        reachability
      );
    }
  }

  private canBotAttack(
    turnTime: number,
    timeRemaining: number,
    combatPlayers: CombatPlayers
  ) {
    const timeToAttack = this.generateRandom(turnTime - 1);
    return (
      this.isPlayerBot(combatPlayers.attacker) &&
      timeRemaining === timeToAttack &&
      !this.isBothPlayersBot(combatPlayers)
    );
  }

  private getTurnTime(combatPlayers: CombatPlayers) {
    if (this.isBothPlayersBot(combatPlayers)) {
      return TWO_BOTS_FIGHT_TIME;
    }
    return this.hasEvasionLeft(combatPlayers.attacker)
      ? FIGHT_TIME
      : NO_EVASION_TIME;
  }

  private hasEvasionLeft(player: Player) {
    return player.attributes.evasion > 0;
  }

  private hasValidActivePlayers(room: Room) {
    const socket = this.getServer().sockets.adapter.rooms.get(room.roomId);
    if (!socket) return false;
    const connectedPlayers = this.getPlayerConnectedInRoom(room);
    return (
      this.hasBotInPlayers(connectedPlayers) || socket.size > SINGLE_PLAYER
    );
  }

  private getPlayerConnectedInRoom(room: Room) {
    return room.listPlayers.filter(
      (player) =>
        player.status !== Status.Disconnected &&
        player.status !== Status.PendingDisconnection
    );
  }

  private hasBotInPlayers(players: Player[]) {
    return players.some((player) => player.status === Status.Bot);
  }

  private isDefensiveBotDamaged(player: Player) {
    return (
      this.isPlayerBot(player) &&
      player.attributes.currentHp < player.attributes.totalHp &&
      this.hasEvasionLeft(player) &&
      player.behavior === Behavior.Defensive
    );
  }

  private addToPostGameStats(
    room: Room,
    players: CombatPlayers,
    attr1: string,
    attr2: string,
    dmgDealt?: number
  ): Player | null {
    const attacker = room.listPlayers.find((p) => p.id === players.attacker.id);
    const defender = room.listPlayers.find((p) => p.id === players.defender.id);
    if (attacker && defender) {
      if(dmgDealt) {
        attacker.postGameStats.damageDealt += dmgDealt;
        defender.postGameStats.damageTaken += dmgDealt;
      } else {
        attacker.postGameStats[attr1 as keyof Player["postGameStats"]]++;
        defender.postGameStats[attr2 as keyof Player["postGameStats"]]++;
      }
      return attacker;
    }
    return null;
  }

  private addEvadeToPostGameStats(evaderId: string, room: Room) {
    const evader = room.listPlayers.find((p) => p.id === evaderId);
    if (evader) {
      evader.postGameStats.evasions++;
    }
  }

  private isBothPlayersBot(combatPlayers: CombatPlayers): boolean {
    return (
      this.isPlayerBot(combatPlayers.attacker) &&
      this.isPlayerBot(combatPlayers.defender)
    );
  }

  private isPlayerBot(player: Player) {
    return player.status === Status.Bot;
  }

  private generateRandom(max: number): number {
    return Math.floor(Math.random() * max + 1);
  }

  private initializeCombatInfos(combatActionData: ActionData, room: Room) {
    const opponent = room.navigation.getCombatOpponent(combatActionData);
    if (!opponent) return;
    const gameTime = this.gameService
      .getTurnTimer(room.roomId)
      .getTimeRemaining();
    const [attacker, defender] = this.setFirstAttacker(
      combatActionData,
      opponent
    );
    const combatPlayers = {
      attacker,
      defender,
      combatResultDetails: DEFAULT_COMBAT_RESULT,
    };
    const combatInfos: CombatInfos = {
      combatPlayers,
      gameTime,
      room,
      failEvasion: false,
      checkedXiphos: false,
    };
    this.handlePlayerOnIce(
      combatPlayers.attacker,
      room.gameMap.tiles,
      room.listPlayers
    );
    this.handlePlayerOnIce(
      combatPlayers.defender,
      room.gameMap.tiles,
      room.listPlayers
    );
    this.combatInfos.set(room.roomId, combatInfos);
    return combatInfos;
  }

  private setFirstAttacker(combatActionData: ActionData, opponent: Player) {
    return opponent &&
      combatActionData.player.attributes.speed < opponent.attributes.speed
      ? [opponent, combatActionData.player]
      : [combatActionData.player, opponent];
  }

  private isEvasionSuccessful() {
    return Math.random() < EVASION_SUCCESS_RATE;
  }

  private hasXiphos(player: Player) {
    return player.inventory.find((items) => items.id === ObjectType.Xiphos);
  }

  private isXiphosActive(player: Player): boolean {
    return this.hasXiphos(player) && this.hasHealthBelowHalf(player);
  }

  private hasHealthBelowHalf(player: Player) {
    return player.attributes.currentHp <= player.attributes.totalHp / 2;
  }

  private applyXiphosEffect(player: Player, opponent: Player, roomId: string) {
    player.attributes.attack += XIPHOS_ATTACK_BONUS;
    opponent.attributes.defense -= XIPHOS_DEFENSE_PENALTY;
    const combatInfos = this.combatInfos.get(roomId);
    if (!combatInfos) {
      return;
    }
    combatInfos.checkedXiphos = true;
  }

  private isAttacker(player: Player, combatPlayers: CombatPlayers) {
    return player.id === combatPlayers.attacker.id;
  }

  private isPlayerAffectedByXiphos(player: Player, checkedXiphos: boolean) {
    return this.hasXiphos(player) && checkedXiphos;
  }

  private resetCombatState(room: Room) {
    const combatInfos = this.combatInfos.get(room.roomId);
    this.gameService.getFightTimer(room.roomId).stopTimer();
    if (!combatInfos) {
      return;
    }
    const { combatPlayers, checkedXiphos } = combatInfos;
    this.removeXiphosEffect(combatPlayers, checkedXiphos);
    room.listPlayers.forEach((player) => {
      this.resetPlayerHealth(player);
    });
  }

  private removeXiphosEffect(
    combatPlayers: CombatPlayers,
    checkedXiphos: boolean
  ) {
    const { attacker, defender } = combatPlayers;
    if (this.isPlayerAffectedByXiphos(attacker, checkedXiphos)) {
      this.updateXiphosAttributes(attacker, defender);
    } else if (this.isPlayerAffectedByXiphos(defender, checkedXiphos)) {
      this.updateXiphosAttributes(defender, attacker);
    }
  }

  private updateXiphosAttributes(playerAffected: Player, opponent: Player) {
    playerAffected.attributes.attack -= XiphosEffect.Attack;
    opponent.attributes.defense += XiphosEffect.Defense;
  }

  private resetPlayerHealth(player) {
    player.attributes.currentHp = player.attributes.totalHp;
  }

  private resetPlayerIcePenalty(room: Room, player: Player) {
    if(player.position === DISCONNECTED_POSITION) return;
    if (
      room.gameMap.tiles[player.position.x][player.position.y] === TileType.Ice
    ) {
      player.attributes.attack += ICE_TILE_PENALTY_VALUE;
      player.attributes.defense += ICE_TILE_PENALTY_VALUE;
    }
  }

  private managePlayerDeath(room: Room, winner: Player, loser: Player) {
    this.gameService.placeItemsOnGround(room, loser);
    this.replacePlayerOnSpawnPoint(loser, room);
    this.handleTurnAfterCombat(winner, room);
    this.resetPlayerIcePenalty(room, winner);
    this.resetPlayerIcePenalty(room, loser);
    this.emitToCombatPlayers(
      { attacker: winner, defender: loser },
      ServerToClientEvent.UpdateStats,
      { winner, loser },
            room.roomId
    );
    this.gameService.handleQuickElimination(room.roomId, loser.uid);
    this.handleCombatWon(winner, room);

  }

  private checkCombatOutcome(room: Room, combatPlayers: CombatPlayers) {
    const { attacker, defender } = combatPlayers;
        this.consumeCombatAction(room);
    if (defender.attributes.currentHp <= 0) {
      this.managePlayerDeath(room, attacker, defender);
      return;
    } else if (attacker.attributes.currentHp <= 0) {
      this.managePlayerDeath(room, defender, attacker);
      return;
    }
    setTimeout(() => {
      this.onEndTurn(room);
    }, ROLL_DURATION);
  }

  private checkEndGame(player: Player, room: Room) {
    if (
      player.postGameStats.victories >= VICTORIES &&
      room.gameMap.mode === GameMode.Classic
    ) {
      this.gameService.onEndGame(player, room);
      this.logService.sendEndGameLog(
        room.listPlayers,
        room.roomId,
        this.getServer()
      );
    } else {
      this.emitEventToRoom(room.roomId, ServerToClientEvent.CombatEnd, {
        listPlayers: room.listPlayers,
        player,
      });
    }
  }

  private checkXiphos(combatPlayers: CombatPlayers, room: Room) {
    const { attacker, defender } = combatPlayers;
    if (this.isXiphosActive(attacker)) {
      this.applyXiphosEffect(attacker, defender, room.roomId);
    }

        if (this.isXiphosActive(defender)) {
            this.applyXiphosEffect(defender, attacker, room.roomId);
        }
        this.emitToCombatPlayers(
            combatPlayers,
            ServerToClientEvent.UpdateStats,
            combatPlayers,
            room.roomId
        );
    }

  private checkAchillesArmor(player: Player, damageDealt: number) {
    if (this.hasAchillesArmor(player)) {
      player.attributes.currentHp -= damageDealt;
      return true;
    }
    return false;
  }

  private hasAchillesArmor(player: Player) {
    return player.inventory.find((items) => items.id === ObjectType.Armor);
  }

    private addStatsForWinLoss(
        room: Room,
        combatPlayers: CombatPlayers,
        attackerWon: boolean
    ) {
        const attacker = room.listPlayers.find(
            (players) => players.id === combatPlayers.attacker.id
        );
        const defender = room.listPlayers.find(
            (players) => players.id === combatPlayers.defender.id
        );
        if (attacker && defender) {
            if (attackerWon) {
                attacker.postGameStats.victories++;
                defender.postGameStats.defeats++;
                return attacker;
            } else {
                attacker.postGameStats.defeats++;
                defender.postGameStats.victories++;
                return defender;
            }
        }
        return null;
    }

  private addVictory(
    combatPlayers: CombatPlayers,
    room: Room,
    attackerWon: boolean
  ) {
    const playerWinner = this.addStatsForWinLoss(
      room,
      combatPlayers,
      attackerWon
    );
    this.addToPostGameStats(
      room,
      combatPlayers,
      PlayerStatType.Combats,
      PlayerStatType.Combats
    );
    this.checkEndGame(playerWinner, room);
  }

  private replacePlayerOnSpawnPoint(player: Player, room: Room) {
    const players = room.listPlayers;
    const playerToReplace = room.listPlayers.find((p) => p.id === player.id);
    if (!playerToReplace) return;
    room.gameMap.itemPlacement[playerToReplace.position.x][
      playerToReplace.position.y
    ] = 0;
    if (this.checkSpawnPointAvailability(playerToReplace, players)) {
      const oldPosition = playerToReplace.position;
      playerToReplace.position = playerToReplace.spawnPosition;
      this.emitEventToRoom(room.roomId, ServerToClientEvent.RespawnPlayer, {
        oldPosition,
        playerToReplace,
      });
    } else {
      const oldPosition = playerToReplace.position;
      this.replacePlayerOnNeighborTile(playerToReplace, room.gameMap);
      this.emitEventToRoom(room.roomId, ServerToClientEvent.RespawnPlayer, {
        oldPosition,
        playerToReplace,
      });
    }
  }

  private checkSpawnPointAvailability(
    player: Player,
    players: Player[]
  ): boolean {
    for (const p of players) {
      if (p.id === player.id) continue;
      if (
        p.position.x === player.spawnPosition.x &&
        p.position.y === player.spawnPosition.y
      ) {
        return false;
      }
    }
    return true;
  }

  private replacePlayerOnNeighborTile(player: Player, gameMap: Game): Position {
    const neighbors = this.getNeighbors(player.spawnPosition, gameMap);
    for (const neighbor of neighbors) {
      if (gameMap.itemPlacement[neighbor.x][neighbor.y] === 0) {
        player.position = neighbor;
        return neighbor;
      }
    }
    player.position = neighbors[0];
    return this.replacePlayerOnNeighborTile(player, gameMap);
  }

  private getRandomValue(max: number) {
    return Math.floor(Math.random() * max + 1);
  }

  private getNeighbors(position: Position, game: Game): Position[] {
    const directions = [
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
    ];
    return directions
      .map(({ dx, dy }) => ({ x: position.x + dx, y: position.y + dy }))
      .filter(({ x, y }) => this.isValidTile(x, y, game.dimension));
  }

  private isValidTile(x: number, y: number, dimension: number): boolean {
    return x >= 0 && y >= 0 && x < dimension && y < dimension;
  }

  private handleDefaultCombatWin(room: Room, player: Player) {
    this.getServer().to(player.id).emit(ServerToClientEvent.DefaultCombatWin);
    this.handleCombatWon(player, room);
  }

  private getOpponent(client: Socket) {
    const combatPlayers = this.combatInfos.get(client.data?.roomCode)
      ?.combatPlayers;
    if (!combatPlayers) return;
    return client.id === combatPlayers.attacker.id
      ? combatPlayers.defender
      : combatPlayers.attacker;
  }

    private handlePlayerOnIce(
        player: Player,
        tiles: number[][],
        listPlayers: Player[]
    ) {
        const playerInRoom = listPlayers.find((p) => p.id === player.id);
        const { x, y } = playerInRoom.position;
        if (tiles[x][y] === TileType.Ice) {
            player.attributes.attack -= ICE_TILE_PENALTY_VALUE;
            player.attributes.defense -= ICE_TILE_PENALTY_VALUE;
        }
    }

    private consumeCombatAction(room: Room) {
        const activePlayer = this.gameService.getActivePlayer(room);
    
        if (activePlayer.attributes.actionPoints > 0)
            activePlayer.attributes.actionPoints--;
    
        this.emitEventToRoom(
            room.roomId,
            ServerToClientEvent.UpdateAllPlayers,
            room.listPlayers
        );
    }
    
}
