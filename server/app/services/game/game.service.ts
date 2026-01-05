import { Navigation } from "@app/classes/navigation/navigation";
import { Stopwatch } from "@app/classes/stopwatch/stopwatch";
import {
  CHALLENGES,
  DEFAULT_ACTION_POINT,
  DEFAULT_ATTRIBUTE,
  DISCONNECTED_POSITION,
  EQUAL_ODDS_PROBABILITY,
  FALLING_PROBABILITY,
  HIGH_ATTRIBUTE,
  LogType,
  MAX_ACTION_POINT,
  MOVEMENT_TIME,
  NO_ITEM,
  SINGLE_PLAYER,
  STARTING_TIME,
  TURN_TIME,
} from "@app/constants";
import { InfoSwap } from "@app/interfaces/info-item-swap";
import { baseBot } from "@app/mocks/mock-players";
import { BotService } from "@app/services/bot/bot.service";
import { GameLogsService } from "@app/services/game-logs/game-logs.service";
import { MatchService } from "@app/services/match/match.service";
import { PlayerInventoryService } from "@app/services/player-inventory/player-inventory.service";
import { RoomService } from "@app/services/room/room.service";
import { ObjectType } from "@common/avatars-info";
import { GameMode, TileCost, TileType } from "@common/constants";
import {
  Avatar,
  Behavior,
  Player,
  PlayerRecord,
  Position,
  Status,
} from "@common/interfaces/player";
import { GameAvailability, GameStatus, Room } from "@common/interfaces/room";
import { ActionData } from "@common/interfaces/socket-data.interface";
import { ServerToClientEvent } from "@common/socket.events";
import { Injectable } from "@nestjs/common";
import { Socket, Server } from "socket.io";
import { Logger } from "@nestjs/common/services/logger.service";
import { UserService } from "@app/services/user/user.service";
import { UserStatisticsService } from "@app/services/user-statistics/user-statistics.service";
import { ChallengeKey } from "@common/interfaces/challenges";
import { ChallengeService } from "../challenge/challenge.service";

/* eslint-disable max-lines */
@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private isMoving: boolean = false;
  private isTurnSkipped: boolean = false;
  private spectatorSocketList: Socket[] = [];

  constructor(
    private roomService: RoomService,
    private playerInventoryService: PlayerInventoryService,
    private gameLogsService: GameLogsService,
    private matchService: MatchService,
    private botService: BotService,
    private userService: UserService,
    private userStatisticsService: UserStatisticsService,
    private challengeService: ChallengeService
  ) {}

  handleJoinGame(
    client: Socket,
    roomId: string,
    isSpectator: boolean
  ): boolean {
    const connectionRes = this.connectPlayerToGame(roomId, isSpectator);
    const room = this.getRoomById(roomId);
    this.roomService.joinRoom(client, roomId);
    if (connectionRes.errorType) {
      this.roomService.leaveRoom(roomId, client);
      client.emit(connectionRes.event, connectionRes.errorType);
      return false;
    }

    if (isSpectator && !this.spectatorSocketList.includes(client)) {
      this.spectatorSocketList.push(client);
    }

    client.emit(connectionRes.event, room);
    this.roomService.emitWaitingRoomsUpdate();
    return true;
  }

  handleCreatePlayer(room: Room, player: Player, socket: Socket) {
    const isAdmin = this.roomService.isPlayerAdmin(room.roomId, socket);
    const isBot = player.status === Status.Bot;

    this.initializePlayer(room, player, socket, isAdmin, isBot);
    this.setUniquePlayerName(player, socket);
    room.listPlayers.push(player);

    const takenAvatar = this.getAvatarByName(room, player.avatar);
    takenAvatar.isTaken = true;

    if (
      !isBot &&
      room.gameStatus === GameStatus.Started &&
      room.dropInEnabled
    ) {
      setTimeout(() => this.handlePlayerDropIn(room, player, socket), 300);
    } else {
      this.handleRegularPlayerJoin(room, socket, isAdmin);
    }
  }

  private initializePlayer(
    room: Room,
    player: Player,
    socket: Socket,
    isAdmin: boolean,
    isBot: boolean
  ): void {
    if (!isBot) {
      player.id = socket.id;
      player.uid = socket.data.userId;
      player.status = isAdmin ? Status.Admin : player.status;
    }

    player.assignedChallenge = this.challengeService.assignRandomChallenge(
      room.gameMap.tiles,
      room.gameMap.dimension
    );
  }

  private handlePlayerDropIn(room: Room, player: Player, socket: Socket): void {
    this.matchService.assignPlayerToAvailableSpawnPoint(socket);
    this.updatePlayerRecordAfterDropIn(room, player, Date.now());
    this.sortPlayersBySpeed(room);
    room.navigation = new Navigation(
      room.gameMap,
      room.gameMap.itemPlacement,
      room.listPlayers
    );
    this.emitPlayerDroppedInEventsToRoom(room);
    if (player.status === Status.Disconnected) {
      this.emitEventToRoom(
        room.roomId,
        ServerToClientEvent.PlayerEliminated,
        player
      );
      player.position = DISCONNECTED_POSITION;
    }
    this.roomService.emitWaitingRoomsUpdate();
    this.logger.log("Player dropped in successfully");
  }

  private handleRegularPlayerJoin(
    room: Room,
    socket: Socket,
    isAdmin: boolean
  ): void {
    this.emitEventToRoom(room.roomId, ServerToClientEvent.UpdatedPlayer, room);
    socket.emit(ServerToClientEvent.IsPlayerAdmin, isAdmin);
  }

  getActivePlayer(room: Room): Player {
    return room.listPlayers.find((player) => player.isActive);
  }

  getRoomById(roomId: string) {
    return this.roomService.rooms.get(roomId);
  }

  getPlayerById(room: Room, socket: Socket) {
    return room.listPlayers.find((player) => player.uid === socket.data.userId);
  }

  getServer() {
    return this.roomService.getServer();
  }

  getTurnTimer(roomId: string) {
    return this.roomService.getTurnTimer(roomId);
  }

  getFightTimer(roomId: string) {
    return this.roomService.getFightTimer(roomId);
  }

  emitEventToRoom(roomId: string, event: string, data?) {
    this.getServer().to(roomId).emit(event, data);
  }

  async leavePlayerFromGame(roomId: string, socket: Socket) {
    const room = this.getRoomById(roomId);
    const isAdmin = this.roomService.isPlayerAdmin(roomId, socket);
    const player = this.getPlayerById(room, socket);
    const isSpectator = this.isSpectator(socket);

    this.logger.debug(`client ${socket.id} left room ${roomId}`);

    socket.emit(ServerToClientEvent.LeftRoom, isAdmin);

    const uid = this.getUserId(socket);

    if (uid && room && !this.isSpectator(socket)) {
      await this.refundEntryFee(room, socket);
    } else if (uid && room && this.isSpectator(socket)) {
      this.logger.debug(`Spectator ${socket.id} left - no refund needed`);
    } else {
      this.logger.warn(
        `Cannot refund entry fee - uid: ${uid}, room found: ${!!room}`
      );
    }
    if (isAdmin) {
      await this.handleAdminDisconnection(room, socket);
    }

    if (isSpectator || !player) {
      if (!player) {
        this.logger.warn(
          `No player entity found for socket ${socket.id} in room ${roomId}; removing socket from room`
        );
      }
      this.removePlayerFromRoom(room, socket);
    } else if (room.gameStatus === GameStatus.Started) {
      this.handlePlayerLeaveFromStartedGame(room, roomId, socket, player);
    } else {
      this.removePlayerFromRoom(room, socket);
    }
    this.roomService.emitWaitingRoomsUpdate();
  }

  private async refundEntryFee(room: Room, socket: Socket): Promise<void> {
    const uid = this.getUserId(socket);

    if (!uid || !room) {
      this.logger.warn(
        `Cannot refund entry fee - uid: ${uid}, room found: ${!!room}`
      );
      return;
    }

    await this.userService.adjustBalance(uid, room.entryFee);
    const balance = await this.userService.getBalance(uid);
    socket.emit(ServerToClientEvent.BalanceUpdated, {balance});
  }

  private handlePlayerLeaveFromStartedGame(
    room: Room,
    roomId: string,
    socket: Socket,
    player: Player
  ): void {
    this.gameLogsService.sendPlayerLog(
      roomId,
      this.getServer(),
      player,
      LogType.GiveUp
    );
    this.updatePlayerRecordAfterDropOut(room, player, Date.now());
    this.handleStartedGameDisconnection(room, socket, player);
  }

  private updatePlayersRecordsAfterDropOut(
    room: Room,
    players: Player[],
    dropOutTime: number
  ): void {
    players.forEach((player) =>
      this.updatePlayerRecordAfterDropOut(room, player, dropOutTime)
    );
  }

  private updatePlayerRecordAfterDropOut(
    room: Room,
    player: Player,
    dropOutTime: number
  ): void {
    if (player.status === Status.Bot) {
      return;
    }

    this.logger.debug(`Update player record after drop out ${player.uid}`);

    const playerRecord = room.playersRecords?.get(player.uid);
    if (!playerRecord) {
      this.logger.warn(
        `No player record found for ${player.uid} during drop out`
      );
      return;
    }

    playerRecord.uid = player.uid;
    playerRecord.attributes = player.attributes;
    playerRecord.postGameStats = player.postGameStats;
    playerRecord.avatar = player.avatar;
    playerRecord.status = player.status;
    playerRecord.assignedChallenge = player.assignedChallenge;
    playerRecord.dropOuts.push(dropOutTime);
  }

  private updatePlayersRecordsAfterDropIn(
    room: Room,
    players: Player[],
    dropInTime: number
  ): void {
    players.forEach((player) =>
      this.updatePlayerRecordAfterDropIn(room, player, dropInTime)
    );
  }

  private updatePlayerRecordAfterDropIn(
    room: Room,
    player: Player,
    dropInTime: number
  ): void {
    if (player.status === Status.Bot) {
      return;
    }

    this.logger.debug(`Update player record after drop in ${player.uid}`);

    if (!room.playersRecords) {
      room.playersRecords = new Map();
    }

    let record: PlayerRecord = room.playersRecords?.get(player.uid);

    if (!record) {
      record = {
        uid: player.uid,
        attributes: player.attributes,
        postGameStats: player.postGameStats,
        name: player.name,
        dropOuts: [],
        dropIns: [],
        avatar: player.avatar,
        status: player.status,
        assignedChallenge: player.assignedChallenge,
      };
    }

    record.dropIns.push(dropInTime);

    // Restore player state from record
    if (player.status === Status.Disconnected) {
      player.attributes = {
        ...player.attributes,
        currentHp: 0,
        movementPointsLeft: 0,
        actionPoints: 0,
      };
    }

    record.attributes = player.attributes;
    player.postGameStats = record.postGameStats;
    player.status = record.status;
    player.assignedChallenge = record.assignedChallenge;
    room.playersRecords.set(player.uid, record as PlayerRecord);
  }

  selectedAvatar(room: Room, avatar: Avatar, socket: Socket) {
    this.freeUpAvatar(room, socket);
    const selectedAvatar = this.getAvatarByName(room, avatar);
    if (selectedAvatar && !selectedAvatar.isTaken) {
      selectedAvatar.isTaken = true;
      socket.data.clickedAvatar = selectedAvatar;
      this.updateAvatarsForAllClients(room.roomId);
    }
  }

  stopGameTimers(room: Room) {
    this.getFightTimer(room.roomId).stopTimer();
    this.getTurnTimer(room.roomId).stopTimer();
  }

  toggleLockRoom(roomId: string, isLocked: boolean) {
    const room = this.getRoomById(roomId);
    room.isLocked = isLocked;
    this.roomService.emitWaitingRoomsUpdate();
  }

  toggleDropInRoom(roomId: string, dropInEnabled: boolean) {
    const room = this.getRoomById(roomId);
    room.dropInEnabled = dropInEnabled;
    this.emitEventToRoom(
      roomId,
      ServerToClientEvent.DropInEnableUpdated,
      dropInEnabled
    );
    this.roomService.emitWaitingRoomsUpdate();
  }

  onStartGame(socket: Socket) {
    const room = this.roomService.getRoom(socket);

    this.initializeGameState(room);
    this.prepareGameMap(room, socket);
    this.activateFirstPlayer(room);
    this.emitStartGameEvents(room);
    this.roomService.emitWaitingRoomsUpdate();
  }

  private initializeGameState(room: Room): void {
    this.initTileHistory(room);
    room.stopwatch = new Stopwatch();
    room.stopwatch.start();
    room.gameStatus = GameStatus.Started;
    this.sortPlayersBySpeed(room);
  }

  private prepareGameMap(room: Room, socket: Socket): void {
    room.navigation = new Navigation(
      room.gameMap,
      room.gameMap.itemPlacement,
      room.listPlayers
    );
    this.matchService.processMapObjects(socket);

    if (!room.dropInEnabled) {
      room.navigation.removeUnusedSpawnPoints();
    }
  }

  private activateFirstPlayer(room: Room): void {
    room.listPlayers[0].isActive = true;
    this.updatePlayersRecordsAfterDropIn(room, room.listPlayers, Date.now());
  }

  onStartTurn(room: Room) {
    const activePlayer = this.getActivePlayer(room);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdateAllPlayers,
      room.listPlayers
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.OtherPlayerTurn,
      activePlayer.name
    );
    this.gameLogsService.sendPlayerLog(
      room.roomId,
      this.getServer(),
      activePlayer,
      LogType.StartTurn
    );

    this.getTurnTimer(room.roomId).startTimer(
      STARTING_TIME,
      (timeRemaining) => {
        this.emitEventToRoom(
          room.roomId,
          ServerToClientEvent.BeforeStartTurnTimer,
          timeRemaining
        );
        if (timeRemaining <= 0) {
          this.playerTurnTimer(room);
        }
      }
    );
    if (activePlayer.status === Status.Bot) {
      this.botService.processBotTurn(room, this.getServer(), activePlayer);
      return;
    }
  }

  onTurnEnded(room: Room) {
    if (this.isMoving) {
      this.isTurnSkipped = true;
      return;
    }
    room.globalPostGameStats.turns++;
    this.updateActivePlayer(room);
    const activePlayer = this.getActivePlayer(room);
    activePlayer.attributes.movementPointsLeft = activePlayer.attributes.speed;
    this.emitEventsOnTurnEnded(room, activePlayer);
    this.checkActions(room);
  }

  createBot(behavior: Behavior, client: Socket) {
    const room = this.roomService.getRoom(client);
    baseBot.id =
      "bot-" + (parseInt(baseBot.id.replace("bot-", ""), 10) + 1).toString();
    baseBot.uid =
      "bot-" + (parseInt(baseBot.uid.replace("bot-", ""), 10) + 1).toString();
    let newBot = this.assignAvatarToBot(room, behavior);
    newBot = this.assignStatsToBot(newBot);
    newBot.collectedItems = [];
    this.handleCreatePlayer(room, newBot, client);
    this.updateAvatarsForAllClients(room.roomId);
    this.emitEventToRoom(room.roomId, ServerToClientEvent.UpdatedPlayer, room);
  }

  onKickBot(socket: Socket, botId: string) {
    const room = this.roomService.getRoom(socket);
    this.getServer().to(botId).emit(ServerToClientEvent.KickPlayer, botId);
    const botPlayer = room.listPlayers.find((player) => player.uid === botId);
    botPlayer.avatar.isTaken = false;
    room.listPlayers = room.listPlayers.filter(
      (player) => player.uid !== botId
    );
    this.emitEventToRoom(room.roomId, ServerToClientEvent.UpdatedPlayer, room);
    this.updateAvatarsForAllClients(room.roomId);
  }

  onKickPlayer(socket: Socket, playerId: string) {
    const room = this.roomService.getRoom(socket);
    this.getServer()
      .to(playerId)
      .emit(ServerToClientEvent.KickPlayer, playerId);
    const playerSocket = this.getServer().sockets.sockets.get(playerId);
    this.removePlayerFromRoom(room, playerSocket);
    this.emitEventToRoom(room.roomId, ServerToClientEvent.UpdatedPlayer, room);
  }

  processTeleportation(room: Room, position: Position) {
    const player = this.getActivePlayer(room);
    const playerId = player.uid;
    if (room.navigation.isTileValidTeleport(position.x, position.y)) {
      player.position = position;
      this.addUniqueTileToHistory(player.positionHistory, position);
      this.addUniqueTileToHistory(
        room.globalPostGameStats.globalTilesVisited,
        position
      );
      this.emitEventToRoom(room.roomId, ServerToClientEvent.TeleportPlayer, {
        position,
        playerId,
      });
    }

    if (room.gameMap.mode === GameMode.CaptureTheFlag) {
      this.checkFlagModeEndGame(player, room);
    }

    const reachability = room.navigation.findReachableTiles(player, room);
    this.emitEventToRoom(room.roomId, ServerToClientEvent.EndMovement);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.ReachableTiles,
      reachability
    );
    this.checkActions(room);
  }

  startItemSwap(infoSwap: InfoSwap) {
    const room = this.roomService.getRoom(infoSwap.client);
    let activePlayer = this.getActivePlayer(room);
    activePlayer = this.playerInventoryService.updatePlayerAfterSwap(infoSwap);

    this.getTurnTimer(room.roomId).resumeTimer((timeLeft) => {
      if (timeLeft <= 0) {
        this.onTurnEnded(room);
      }
      infoSwap.server
        .to(room.roomId)
        .emit(ServerToClientEvent.StartedTurnTimer, timeLeft);
    });
    infoSwap.client.emit(ServerToClientEvent.UpdatedInventory, activePlayer);
  }

  async onEndGame(winner: Player, room: Room) {
    room.gameStatus = GameStatus.Ended;
    room.stopwatch.stop();
    room.globalPostGameStats.gameDuration = room.stopwatch.getTime();

    this.updatePlayersRecordsAfterDropOut(room, room.listPlayers, Date.now());

    // DEBUT DEBUG
    this.logger.debug(
      `[onEndGame] playersRecords size: ${room.playersRecords?.size || 0}`
    );
    this.logger.debug(
      `[onEndGame] playersRecords keys: ${Array.from(
        room.playersRecords?.keys() || []
      )}`
    );
    // FIN DEBUG
    if (room.playersRecords && room.playersRecords?.size > 0) {
      await this.userStatisticsService.updatePlayersStatsAfterGame(
        room.playersRecords,
        winner.uid,
        room.gameMap.mode
      );
    } else {
      this.logger.warn(
        `[onEndGame] No players records to update for room ${room.roomId}`
      );
    }
    this.incrementChallengesCompletedForPlayers(room.listPlayers);
    const roomToSend = {
      ...room,
      playersRecords: room.playersRecords
        ? Object.fromEntries(room.playersRecords)
        : undefined,
    };
    this.emitEventToRoom(room.roomId, ServerToClientEvent.EndGame, {
      winner,
      room: roomToSend,
    });
    this.resetGlobalStats(room);
    this.stopGameTimers(room);
  }

  getTilesVisited(player: Player): number {
    return new Set(player.positionHistory.map((pos) => `${pos.x},${pos.y}`))
      .size;
  }

  incrementChallengesCompletedForPlayers(players: Player[]) {
    for (const player of players) {
      if (
        player.uid &&
        !player.uid.startsWith("bot-") &&
        this.isChallengeAchieved(player)
      ) {
        this.userStatisticsService.incrementChallengesCompleted(player.uid);
      }
    }
  }

  private isChallengeAchieved(player: Player): boolean {
    const {key, goal} = player.assignedChallenge;
    const stats = player.postGameStats;

    switch (key) {
      case ChallengeKey.VisitedTiles:
        return this.getTilesVisited(player) >= goal;
      case ChallengeKey.Evasions:
        return stats.evasions >= goal;
      case ChallengeKey.Items:
        return player.collectedItems.length >= goal;
      case ChallengeKey.Wins:
        return stats.victories >= goal;
      case ChallengeKey.DoorsInteracted:
        return stats.doorsInteracted >= goal;
      default:
        return false;
    }
  }

  private async forceEndGame(room: Room) {
    this.logger.error("forceEndGame", !room);
    if (!room) return;

    const activePlayers = room.listPlayers.filter(
      (player) => player.status !== Status.Disconnected
    );

    if (activePlayers.length === 1) {
      this.logger.error("only one left!");
      const winner = activePlayers[0];
      await this.onEndGame(winner, room);
    } else {
      this.logger.error("only one left! KIDDINGGG");

      const anyActivePlayer = room.listPlayers.find(
        (p) => p.status !== Status.Disconnected
      );
      this.logger.error("oGame doneeeeeee!", anyActivePlayer);

      if (anyActivePlayer) {
        await this.onEndGame(anyActivePlayer, room);
      }
    }
  }

  handleDoor(client: Socket, doorActionData: ActionData) {
    const {clickedPosition, player} = doorActionData;
    const room = this.roomService.getRoom(client);
    if (
      room.navigation.hasHandleDoorAction(
        clickedPosition.x,
        clickedPosition.y,
        player
      )
    ) {
      this.handleToggleDoor(client, room, clickedPosition);
    }
  }

  async processNavigation(room: Room, path: Position[], client: Socket) {
    const player = this.getActivePlayer(room);
    this.initTileHistory(room);
    if (!Array.isArray(path)) {
      if (path && typeof path === "object") {
        path = [path];
      } else {
        console.warn("Invalid path received:", path);
        return;
      }
    }
    const beforeMoveNumOfPlayers = room.listPlayers.length;
    let hasNewPlayerJoined = false;
    for (const tile of path) {
      this.isMoving = true;
      player.position = tile;
      hasNewPlayerJoined = beforeMoveNumOfPlayers < room.listPlayers.length;
      if (
        (await this.handleTileActions(room, client, player, tile)) ||
        hasNewPlayerJoined
      ) {
        break;
      }
    }
    this.handleEndNavigation(room, player, client);
  }

  placeItemsOnGround(room: Room, player: Player) {
    const playerToDropItems = room.listPlayers.find(
      (p) => p.uid === player.uid
    );
    if (playerToDropItems.inventory.length === 0) return;
    this.playerInventoryService.restoreInitialStats(playerToDropItems);
    for (const items of playerToDropItems.inventory) {
      const position = room.navigation.findClosestValidTile(
        playerToDropItems,
        room
      );
      room.gameMap.itemPlacement[position.x][position.y] = items.id;
      this.emitEventToRoom(
        room.roomId,
        ServerToClientEvent.UpdateObjectsAfterCombat,
        {newGrid: room.gameMap.itemPlacement, position}
      );
    }
    playerToDropItems.inventory = [];
    this.getServer()
      .to(playerToDropItems.id)
      .emit(ServerToClientEvent.UpdatedInventory, playerToDropItems);
  }

  private emitEventsOnTurnEnded(room: Room, activePlayer: Player) {
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.Reachability,
      activePlayer
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.ActivePlayer,
      activePlayer
    );

    const host = room.listPlayers.find(
      (player) =>
        player.status === Status.Player || player.status === Status.Admin
    );
    if (host) {
      this.getServer().to(host.id).emit(ServerToClientEvent.TurnEnded);
      this.emitEventToRoom(
        room.roomId,
        ServerToClientEvent.UpdateVisual,
        room.listPlayers
      );
    } else {
      this.onStartTurn(room);
    }

    room.navigation.isBot = activePlayer.status === Status.Bot;
    const reachability = room.navigation.findReachableTiles(activePlayer, room);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.ReachableTiles,
      reachability
    );
  }

  private assignStatsToBot(bot: Player): Player {
    bot.attributes.currentHp =
      Math.random() > EQUAL_ODDS_PROBABILITY
        ? HIGH_ATTRIBUTE
        : DEFAULT_ATTRIBUTE;
    bot.attributes.speed =
      bot.attributes.currentHp === HIGH_ATTRIBUTE
        ? DEFAULT_ATTRIBUTE
        : HIGH_ATTRIBUTE;

    bot.attributes.atkDiceMax =
      Math.random() > EQUAL_ODDS_PROBABILITY
        ? HIGH_ATTRIBUTE
        : DEFAULT_ATTRIBUTE;
    bot.attributes.defDiceMax =
      bot.attributes.atkDiceMax === HIGH_ATTRIBUTE
        ? DEFAULT_ATTRIBUTE
        : HIGH_ATTRIBUTE;
    bot.attributes.initialHp = bot.attributes.currentHp;
    bot.attributes.totalHp = bot.attributes.currentHp;
    bot.attributes.initialSpeed = bot.attributes.speed;
    return bot;
  }

  private assignAvatarToBot(room: Room, behavior: Behavior): Player {
    const newBot = JSON.parse(JSON.stringify(baseBot));
    newBot.behavior = behavior;
    const behaviorSuffix = behavior === Behavior.Aggressive ? "-A" : "-D";
    const availableAvatars = room.availableAvatars.filter(
      (avatar) => !avatar.isTaken
    );
    if (availableAvatars.length > 0) {
      const randomAvatar =
        availableAvatars[Math.floor(Math.random() * availableAvatars.length)];
      newBot.avatar = randomAvatar;
      newBot.name = `${randomAvatar.name}${behaviorSuffix}-bot`;
      randomAvatar.isTaken = true;
    }
    return newBot;
  }

  private updateAvatarsForAllClients(roomId: string) {
    this.getServer().sockets.sockets.forEach((clientSocket: Socket) => {
      if (clientSocket.rooms.has(roomId)) {
        this.sendAvatarListToClient(clientSocket);
      }
    });
  }

  private setUniquePlayerName(player: Player, socket: Socket) {
    const playerName = this.generateUniquePlayerName(player.name, socket);
    player.name = playerName;
  }

  private addUniqueTileToHistory(positionList: Position[], tile: Position) {
    if (tile.x < 0 || tile.y < 0) return;
    if (!positionList.some((pos) => pos.x === tile.x && pos.y === tile.y)) {
      positionList.push(tile);
    }
  }

  private initTileHistory(room: Room) {
    for (const player of room.listPlayers) {
      this.addUniqueTileToHistory(player.positionHistory, player.spawnPosition);
      this.addUniqueTileToHistory(
        room.globalPostGameStats.globalTilesVisited,
        player.spawnPosition
      );
    }
  }

  private resetGlobalStats(room: Room) {
    room.globalPostGameStats.globalTilesVisited = [];
    room.globalPostGameStats.doorsInteracted = [];
    room.globalPostGameStats.turns = 1;
    room.globalPostGameStats.nbFlagBearers = 0;
    room.globalPostGameStats.gameDuration = "";
  }

  private checkActions(room: Room) {
    this.checkDoors(room);
    this.checkAttack(room);
  }

  private checkEndTurn(client: Socket, activePlayer: Player): boolean {
    if (!activePlayer || !this.isActivePlayer(client)) return;
    const room = this.roomService.getRoom(client);
    const reachableTileCount = room.navigation.findReachableTiles(
      activePlayer,
      room
    ).length;
    const players = room.listPlayers;

    if (
      !room.navigation.haveActions(activePlayer, players) &&
      reachableTileCount === 0
    ) {
      return true;
    } else if (
      !room.navigation.hasMovementPoints(activePlayer) &&
      !room.navigation.haveActions(activePlayer, players)
    ) {
      return true;
    } else if (
      !room.navigation.hasMovementPoints(activePlayer) &&
      !room.navigation.hasActionPoints(activePlayer)
    ) {
      return true;
    }
    return false;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async handleTileActions(
    room: Room,
    client: Socket,
    player: Player,
    tile: Position
  ): Promise<boolean> {
    const hasPickUpItem = this.handleItemPickup(room, client, player, tile);
    await this.processTileNavigation(room, tile);
    player.attributes.movementPointsLeft -= this.getCost(
      room.gameMap.tiles[tile.x][tile.y],
      player
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdateAllPlayers,
      room.listPlayers
    );
    return hasPickUpItem;
  }

  private async processTileNavigation(room: Room, tile: Position) {
    const player = this.getActivePlayer(room);
    this.addUniqueTileToHistory(player.positionHistory, tile);
    this.addUniqueTileToHistory(
      room.globalPostGameStats.globalTilesVisited,
      tile
    );

    if (room.gameMap.mode === GameMode.CaptureTheFlag) {
      this.checkFlagModeEndGame(player, room);
    }

    if (this.isMoving) {
      await this.delay(MOVEMENT_TIME);
    }
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.PlayerNavigation,
      tile
    );
  }

  private handleEndNavigation(room: Room, player: Player, client: Socket) {
    this.isMoving = false;
    const reachability = room.navigation.findReachableTiles(player, room);
    this.emitEventToRoom(room.roomId, ServerToClientEvent.EndMovement);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.ReachableTiles,
      reachability
    );
    if (this.checkEndTurn(client, player)) {
      this.onTurnEnded(room);
      return;
    }
    if (this.isTurnSkipped) {
      this.onTurnEnded(room);
      this.isTurnSkipped = false;
      return;
    }
    this.checkActions(room);
  }

  private handleItemPickup(
    room: Room,
    client: Socket,
    player: Player,
    tile: Position
  ): boolean {
    if (this.isObject(room, tile)) {
      const infoSwap: InfoSwap = {
        server: this.getServer(),
        client,
        player,
      };
      this.playerInventoryService.updateInventory(
        infoSwap,
        room.gameMap.itemPlacement
      );
      this.emitEventToRoom(
        room.roomId,
        ServerToClientEvent.UpdateObjects,
        room.gameMap.itemPlacement
      );
      return true;
    }
    return false;
  }

  private emitStartGameEvents(room: Room) {
    const activePlayer = this.getActivePlayer(room);
    this.emitEventToRoom(room.roomId, ServerToClientEvent.StartGame, room);
    this.emitEventToRoom(room.roomId, ServerToClientEvent.MapInformation, room);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.GameGridMapInfo,
      room
    );
    this.onStartTurn(room);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.ActivePlayer,
      activePlayer
    );
    const reachability = room.navigation.findReachableTiles(activePlayer, room);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.ReachableTiles,
      reachability
    );
    this.checkActions(room);
  }
  private emitPlayerDroppedInEventsToRoom(room: Room) {
    const activePlayer = this.getActivePlayer(room);
    this.emitEventToRoom(room.roomId, ServerToClientEvent.MapInformation, room);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.GameGridMapInfo,
      room
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.ActivePlayer,
      activePlayer
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.OtherPlayerTurn,
      activePlayer.name
    );
    const reachability = room.navigation.findReachableTiles(activePlayer, room);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.ReachableTiles,
      reachability
    );
    this.checkActions(room);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdateObjects,
      room.gameMap.itemPlacement
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.NewPlayerDroppedIn,
      room
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdatePlayerList,
      room.listPlayers
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdateVisual,
      room.listPlayers
    );
  }

  private connectPlayerToGame(roomId: string, isSpectator: boolean) {
    if (!this.isCodeFormatValid(roomId)) {
      return {event: "joinError", errorType: "invalidFormat"};
    }

    if (!this.roomService.isRoomActive(roomId)) {
      return {event: "joinError", errorType: "roomNotFound"};
    }

    const game = this.getRoomById(roomId);
    if (!game) {
      return {event: "joinError", errorType: "roomNotFound"};
    }

    if (isSpectator && game.gameStatus === GameStatus.Lobby) {
      return {event: "joinError", errorType: "gameNotStarted"};
    }

    if (!isSpectator && this.isRoomFull(game)) {
      return {event: "joinError", errorType: "roomFull"};
    }

    if (!isSpectator && this.isRoomLockedForRegularPlayer(game)) {
      return {event: "joinError", errorType: "roomLocked"};
    }

    return {event: "joinedRoom"};
  }

  private isRoomFull(room: Room): boolean {
    return room.listPlayers.length >= room.gameMap.nbPlayers;
  }

  private isRoomLockedForRegularPlayer(room: Room): boolean {
    if (room.gameStatus === GameStatus.Lobby) {
      return room.isLocked;
    }

    if (room.gameStatus === GameStatus.Started) {
      return !room.dropInEnabled;
    }

    return false;
  }

  private handleToggleDoor(
    client: Socket,
    room: Room,
    clickedPosition: Position
  ) {
    const activePlayer = this.getActivePlayer(room);
    this.addUniqueTileToHistory(
      room.globalPostGameStats.doorsInteracted,
      clickedPosition
    );
    activePlayer.postGameStats.doorsInteracted++;
    this.gameLogsService.sendDoorLog(
      room.gameMap.tiles[clickedPosition.x][clickedPosition.y],
      activePlayer,
      room.roomId,
      this.getServer()
    );
    activePlayer.attributes.actionPoints--;
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.DoorClicked,
      room.navigation.gameMap.tiles
    );
    const reachability = room.navigation.findReachableTiles(activePlayer, room);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.ReachableTiles,
      reachability
    );
    if (this.checkEndTurn(client, activePlayer)) {
      this.onTurnEnded(room);
    }
  }

  private addActionPoints(player?: Player) {
    if (!player || !player.attributes) {
      return;
    }
    if (this.hasTridentObject(player)) {
      this.updateTridentEffect(player);
    } else {
      player.attributes.actionPoints = DEFAULT_ACTION_POINT;
    }
  }

  private playerInWall(room: Room, player?: Player) {
    if (!player || !player.position) {
      return false;
    }
    if (player.position === DISCONNECTED_POSITION) return false;
    return (
      room.gameMap.tiles[player.position.x][player.position.y] === TileType.Wall
    );
  }

  private hasTridentObject(player?: Player) {
    return player?.inventory?.find((items) => items.id === ObjectType.Trident);
  }

  private updateTridentEffect(player: Player) {
    if (player.attributes.actionPoints === DEFAULT_ACTION_POINT) {
      player.attributes.maxActionPoints = MAX_ACTION_POINT;
      player.attributes.actionPoints += DEFAULT_ACTION_POINT;
    } else {
      player.attributes.actionPoints = DEFAULT_ACTION_POINT;
    }
  }

  private isTileIce(room: Room, tile: Position) {
    return room.gameMap.tiles[tile.x][tile.y] === TileType.Ice;
  }

  private isObject(room: Room, tile: Position) {
    const objectId = room.gameMap.itemPlacement[tile.x][tile.y];
    return (
      (objectId > NO_ITEM && objectId <= ObjectType.Random) ||
      this.isObjectFlag(room, tile)
    );
  }

  private isObjectFlag(room: Room, tile: Position) {
    return room.gameMap.itemPlacement[tile.x][tile.y] === ObjectType.Flag;
  }

  private checkFlagModeEndGame(player: Player, room: Room) {
    const hasPlayerFlag = player.inventory.find(
      (object) => object.id === ObjectType.Flag
    );
    const isPlayerOnSpawn =
      player.position.x === player.spawnPosition.x &&
      player.position.y === player.spawnPosition.y;
    if (isPlayerOnSpawn && hasPlayerFlag) {
      this.onEndGame(player, room);
      this.gameLogsService.sendEndGameLog(
        room.listPlayers,
        room.roomId,
        this.getServer()
      );
    }
  }

  private checkAttack(room: Room) {
    const activePlayer = this.getActivePlayer(room);
    if (
      room.navigation.checkAttack(activePlayer, room.listPlayers) &&
      room.navigation.hasActionPoints(activePlayer)
    ) {
      const targets = room.navigation.getNeighborPlayers(
        activePlayer,
        room.listPlayers
      );
      this.emitEventToRoom(room.roomId, ServerToClientEvent.AttackAround, {
        attackAround: true,
        targets,
      });
    } else {
      this.emitEventToRoom(
        room.roomId,
        ServerToClientEvent.AttackAround,
        false
      );
    }
  }

  private checkDoors(room: Room) {
    const activePlayer = this.getActivePlayer(room);
    if (
      room.navigation.checkDoor(activePlayer, room.listPlayers) &&
      room.navigation.hasActionPoints(activePlayer)
    ) {
      const targets = room.navigation.getNeighborDoors(
        activePlayer,
        room.listPlayers
      );
      this.emitEventToRoom(room.roomId, ServerToClientEvent.DoorAround, {
        doorAround: true,
        targets,
      });
    } else {
      this.emitEventToRoom(room.roomId, ServerToClientEvent.DoorAround, false);
    }
  }

  private freeUpAvatar(room: Room, socket: Socket) {
    if (socket.data.clickedAvatar) {
      this.logger.error(`Avatar ${socket.data.clickedAvatar} is free up`);
      const previousAvatar = this.getAvatarByName(
        room,
        socket.data.clickedAvatar
      );
      if (previousAvatar) {
        previousAvatar.isTaken = false;
      }
    }
  }

  private getCost(tileType: number, activePlayer: Player): number {
    switch (tileType) {
      case TileType.Ground:
        return TileCost.Ground;
      case TileType.Water:
        return TileCost.Water;
      case TileType.Ice:
        return TileCost.Ice;
      case TileType.OpenDoor:
        return TileCost.OpenDoor;
      case TileType.Wall:
        return this.hasKuneeItem(activePlayer) ? TileCost.Ground : Infinity;
      default:
        return Infinity;
    }
  }

  private hasKuneeItem(player?: Player) {
    return player?.inventory?.find((objects) => objects.id === ObjectType.Kunee);
  }

  private generateUniquePlayerName(playerName: string, socket: Socket): string {
    let name = playerName;
    let suffix = 2;

    while (this.isPlayerNameTaken(name, socket)) {
      name = `${playerName}-${suffix}`;
      suffix++;
    }
    return name;
  }

  private getAvatarByName(room: Room, avatar: Avatar) {
    return room.availableAvatars.find((av) => av.name === avatar.name);
  }

  private getPlayerConnectedInRoom(room: Room) {
    return room.listPlayers.filter(
      (player) => player.status !== Status.Disconnected
    );
  }

  private isActivePlayer(socket: Socket) {
    const room = this.roomService.getRoom(socket);
    const currentPlayer = this.getPlayerById(room, socket);
    return currentPlayer.isActive;
  }

  private isLastPlayer(room: Room, isLeaving: boolean = false) {
    const activePlayers = room.listPlayers.filter(
      (player) => player.status !== Status.Disconnected
    );
    if (activePlayers.length === SINGLE_PLAYER) return true;
    const botsActive = room.listPlayers.filter(
      (player) => player.uid.startsWith("bot-") && player.status === Status.Bot
    );
    const humansEliminated = room.listPlayers.filter(
      (player) =>
        !player.uid.startsWith("bot-") && player.status === Status.Disconnected
    );

    const botsEliminated = room.listPlayers.filter(
      (player) =>
        player.uid.startsWith("bot-") && player.status === Status.Disconnected
    );

    if (botsActive.length + botsEliminated.length === room.listPlayers.length)
      return true;

    if (isLeaving &&
      humansEliminated.length === 1 &&
      botsActive.length + botsEliminated.length === room.listPlayers.length - 1
    )
      return true;
    return false;
  }

  private isCodeFormatValid(roomCode: string): boolean {
    return /^[0-9]{4}$/.test(roomCode);
  }

  private isPlayerNameTaken(name: string, socket: Socket) {
    const playersList = this.roomService.getRoom(socket).listPlayers;
    return playersList.some((player) => player.name === name);
  }

  private playerTurnTimer(room: Room) {
    this.getTurnTimer(room.roomId).resetTimer(TURN_TIME, (timeRemaining) => {
      this.emitEventToRoom(
        room.roomId,
        ServerToClientEvent.StartedTurnTimer,
        timeRemaining
      );
      if (timeRemaining <= 0) {
        this.onTurnEnded(room);
      }
    });
  }

  private sendAvatarListToClient(socket: Socket) {
    const room = this.roomService.getRoom(socket);
    const customizedAvatarsList = room.availableAvatars.map((avatar) => {
      const isSelectedByClient =
        socket.data.clickedAvatar?.name === avatar.name;
      return {
        ...avatar,
        isTaken: !isSelectedByClient && avatar.isTaken,
        isSelected: isSelectedByClient,
      };
    });
    socket.emit(ServerToClientEvent.CharacterSelected, customizedAvatarsList);
  }

  private sortPlayersBySpeed(room: Room) {
    let listPlayers = room.listPlayers;
    if (listPlayers.length > 1) {
      listPlayers.sort(
        (player1, player2) =>
          player2.attributes.speed - player1.attributes.speed
      );
      listPlayers = [
        ...listPlayers.filter(
          (player) => player.status !== Status.Disconnected
        ),
        ...listPlayers.filter(
          (player) => player.status === Status.Disconnected
        ),
      ];
    }
    room.listPlayers = listPlayers;
  }

  private updateActivePlayer(room: Room) {
    const listPlayers = this.getPlayerConnectedInRoom(room);
    const index = listPlayers.findIndex(
      (item) => item.id === this.getActivePlayer(room).id
    );
    const previousActivePlayer = listPlayers[index];
    this.addActionPoints(previousActivePlayer);

    if (this.playerInWall(room, previousActivePlayer)) {
      this.removePlayerFromWall(room, previousActivePlayer);
    }
    listPlayers[index] = previousActivePlayer;
    const nextIndex = (index + 1) % listPlayers.length;
    listPlayers[index].isActive = false;
    listPlayers[nextIndex].isActive = true;
  }

  private removePlayerFromWall(room: Room, previousActivePlayer: Player) {
    room.gameMap.itemPlacement[previousActivePlayer.position.x][
      previousActivePlayer.position.y
    ] = 0;
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdateObjectsAfterCombat,
      {
        newGrid: room.gameMap.itemPlacement,
        position: {
          x: previousActivePlayer.position.x,
          y: previousActivePlayer.position.y,
        },
      }
    );

    const destination = room.navigation.movePlayerFromWall(
      room,
      previousActivePlayer
    );
    room.navigation.findFastestPath(previousActivePlayer, destination, room);

    previousActivePlayer.position = destination;
    room.gameMap.itemPlacement[previousActivePlayer.position.x][
      previousActivePlayer.position.y
    ] = previousActivePlayer.avatar.id;
    this.processTeleportation(room, previousActivePlayer.position);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdateObjectsAfterCombat,
      {
        newGrid: room.gameMap.itemPlacement,
        position: previousActivePlayer.position,
      }
    );
  }

  private async handleAdminDisconnection(room: Room, socket: Socket) {
    if (room.isDebug && room.gameStatus === GameStatus.Started) {
      room.isDebug = false;
      this.emitEventToRoom(room.roomId, ServerToClientEvent.DebugMode, false);
    } else if (room.gameStatus === GameStatus.Lobby) {
      await this.refundAllPlayers(room, socket);
      this.roomService.deleteRoom(room.roomId, socket);
    }
  }

  private async refundAllPlayers(room: Room, adminSocket: Socket) {
    for (const player of room.listPlayers) {
      if (player.uid === adminSocket.data.userId) {
        continue;
      }

      const playerSocket = this.getServer().sockets.sockets.get(player.id);
      if (playerSocket) {
        const uid = this.getUserId(playerSocket);
        if (uid) {
          await this.userService.adjustBalance(uid, room.entryFee);
          const balance = await this.userService.getBalance(uid);
          playerSocket.emit(ServerToClientEvent.BalanceUpdated, {balance});
        }
      }
    }
  }

  private handleStartedGameDisconnection(
    room: Room,
    socket: Socket,
    player: Player
  ) {
    this.handlePlayerDisconnection(room, socket);
    this.freeUpAvatar(room, socket);
    this.updateAvatarsForAllClients(room.roomId);
    room.listPlayers = room.listPlayers.filter((p) => p.uid !== player.uid);
    this.sortPlayersBySpeed(room);
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdatePlayerList,
      room.listPlayers
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdateVisual,
      room.listPlayers
    );
    const activePlayer = this.getActivePlayer(room);
    player.position = DISCONNECTED_POSITION;
    if (activePlayer.uid !== player.uid) {
      const reachability = room.navigation.findReachableTiles(
        activePlayer,
        room
      );
      this.emitEventToRoom(
        room.roomId,
        ServerToClientEvent.ReachableTiles,
        reachability
      );
    }
  }

  private handlePlayerDisconnection(room: Room, socket: Socket) {
    const disconnectedPlayer = this.getPlayerById(room, socket);
    this.placeItemsOnGround(room, disconnectedPlayer);
    this.handleTurnAfterDisconnection(room, socket, disconnectedPlayer);
    disconnectedPlayer.status = Status.Disconnected;
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.PlayerDisconnected,
      disconnectedPlayer
    );
    if (this.isLastPlayer(room,true)) {
      this.logger.log("isLastPlayer", room.roomId);
      this.forceEndGame(room);
      return;
    }
    this.sortPlayersBySpeed(room);
  }

  private handleTurnAfterDisconnection(
    room: Room,
    socket: Socket,
    disconnectedPlayer: Player
  ) {
    if (this.isActivePlayer(socket)) {
      disconnectedPlayer.status = Status.PendingDisconnection;
      this.onTurnEnded(room);
    }
  }

  private removePlayerFromRoom(room: Room, socket: Socket) {
    if (this.isSpectator(socket)) {
      this.spectatorSocketList = this.spectatorSocketList.filter(
        (spectator) => spectator.id !== socket.id
      );
    } else {
      room.listPlayers = room.listPlayers.filter(
        (player) => player.uid !== socket.data.userId
      );
      this.freeUpAvatar(room, socket);
      this.updateAvatarsForAllClients(room.roomId);
      this.roomService.leaveRoom(room.roomId, socket);
      socket.to(room.roomId).emit(ServerToClientEvent.UpdatedPlayer, room);
      this.roomService.emitWaitingRoomsUpdate();
    }
  }

  async validateAndJoinRoom(
    client: Socket,
    roomId: string,
    forceJoin: boolean,
    isSpectator: boolean,
    server: Server
  ) {
    const room = this.roomService.getRoom({
      data: {roomCode: roomId},
    } as Socket);
    if (!room) {
      client.emit(ServerToClientEvent.JoinError, "roomNotFound");
      return;
    }

    const accessResult = await this.roomService.checkRoomAccess(
      client,
      roomId,
      forceJoin,
      isSpectator
    );

    if (!accessResult.allowed) {
      if (
        accessResult.errorType === "hasBlockedUsersInRoom" &&
        accessResult.blockStatus
      ) {
        client.emit(ServerToClientEvent.BlockedByUserInRoom, {
          blockedUsers: accessResult.blockStatus.hasBlockedUsers,
          roomId: roomId,
        });
        return;
      }

      client.emit(ServerToClientEvent.JoinError, accessResult.errorType);
      return;
    }
    if (
      room.gameAvailability === GameAvailability.FriendsOnly &&
      !isSpectator
    ) {
      const canJoin = await this.checkFriendsOnlyAccess(client, room, server);
      if (!canJoin) {
        client.emit(ServerToClientEvent.JoinError, "friendsOnlyAccess");
        return;
      }
    }

    const uid = this.getUserId(client);
    if (!uid) {
      client.emit(ServerToClientEvent.JoinError, "serverError");
      return;
    }
    const userAccount = await this.userService.getUserAccount(uid);
    if (!userAccount) {
      client.emit(ServerToClientEvent.JoinError, "serverError");
      return;
    }

    if (!isSpectator) {
      this.logger.log("Entry Fee at join: " + room.entryFee);
      if (room.entryFee && room.entryFee > 0) {
        if (userAccount.balance < room.entryFee) {
          client.emit(ServerToClientEvent.JoinError, "insufficientFunds");
          return;
        }
      }
    }

    const joinSuccessful = this.handleJoinGame(client, roomId, isSpectator);
    if (!joinSuccessful) {
      return;
    }

    if (!isSpectator && room.entryFee && room.entryFee > 0 && userAccount) {
      const updatedBalance = await this.userService.adjustBalance(
        uid,
        -room.entryFee
      );

      client.emit(ServerToClientEvent.BalanceUpdated, {
        balance: updatedBalance,
      });
    }
  }

  private getUserId(socket: Socket): string | null {
    return socket.data?.userId || null;
  }

  isSpectator(client: Socket): boolean {
    return this.spectatorSocketList.includes(client);
  }

  isSpectatorById(socketId: string): boolean {
    return this.spectatorSocketList.some(
      (spectator) => spectator.id === socketId
    );
  }

  getSpectators(roomId: string): Socket[] {
    return this.spectatorSocketList.filter(
      (spectator) => this.roomService.getRoomId(spectator) === roomId
    );
  }

  private async checkFriendsOnlyAccess(
    client: Socket,
    room: Room,
    server: Server
  ): Promise<boolean> {
    try {
      if (room.adminId === client.id) {
        return true;
      }

      const adminSocket = server.sockets.sockets.get(room.adminId);
      if (!adminSocket || !adminSocket.data.userId) {
        return false;
      }

      const joiningUserId = client.data.userId;
      if (!joiningUserId) {
        return false;
      }

      const adminFriends = await this.userService.getFriends(
        adminSocket.data.userId
      );

      return adminFriends.some((friend) => friend.uid === joiningUserId);
    } catch (error) {
      this.logger.error(`Error checking friends-only access: ${error.message}`);
      return false;
    }
  }

  handleQuickElimination(roomId: string, loserUid: string) {
    const room = this.roomService.getRoomById(roomId);
    if (!room.quickEliminationEnabled) return;
    const loser = room.listPlayers.find((player) => player.uid === loserUid);

    if (loser.status === Status.Bot) this.handleBotElimination(room, loser);
    else {
      const loserSocket = this.getServer().sockets.sockets.get(loser.id);
      this.handlePlayerElimination(room, loserSocket);
    }
    loser.position = DISCONNECTED_POSITION;
    loser.attributes.currentHp = 0;
    loser.attributes.movementPointsLeft = 0;
    loser.attributes.speed = 0;
    loser.attributes.actionPoints = 0;
    room.navigation.gameMap = room.gameMap;
    room.navigation.positions = room.gameMap.itemPlacement;
    room.navigation.players = room.listPlayers;
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdateAllPlayers,
      room.listPlayers
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdateVisual,
      room.listPlayers
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.UpdatePlayerList,
      room.listPlayers
    );
    const activePlayer = this.getActivePlayer(room);
    const reachability = room.navigation.findReachableTiles(
      activePlayer,
      room
    );
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.ReachableTiles,
      reachability
    );
  }

  private handlePlayerElimination(room: Room, socket: Socket) {
    const disconnectedPlayer = this.getPlayerById(room, socket);
    this.handleTurnAfterElimination(room, socket, disconnectedPlayer);
    disconnectedPlayer.status = Status.Disconnected;

    if (this.isLastPlayer(room)) {
      this.forceEndGame(room);
      return;
    }
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.PlayerEliminated,
      disconnectedPlayer
    );
  }

  private handleTurnAfterElimination(
    room: Room,
    socket: Socket,
    disconnectedPlayer: Player
  ) {
    if (this.isActivePlayer(socket)) {
      disconnectedPlayer.status = Status.PendingDisconnection;
      this.onTurnEnded(room);
    }
  }
  private handleBotElimination(room: Room, bot: Player) {
    if (bot.isActive) {
      bot.status = Status.PendingDisconnection;
      this.onTurnEnded(room);
    }
    bot.status = Status.Disconnected;

    if (this.isLastPlayer(room)) {
      this.forceEndGame(room);
      return;
    }
    this.emitEventToRoom(
      room.roomId,
      ServerToClientEvent.PlayerEliminated,
      bot
    );
  }

  updatePlayerRecordAfterDisconnectionDuringCombat(
    roomId: string,
    loserUid: string
  ) {
    const room = this.getRoomById(roomId);
    const playerRecord = room.playersRecords?.get(loserUid);
    if (playerRecord) {
      this.logger.error(" YOOOOO playerRecord", playerRecord.status);
      playerRecord.status = Status.Disconnected;
      playerRecord.attributes.currentHp = 0;
      playerRecord.attributes.movementPointsLeft = 0;
      playerRecord.attributes.speed = 0;
      playerRecord.attributes.actionPoints = 0;
      this.logger.error(" YAAAA ", playerRecord.status);
      room.playersRecords?.set(loserUid, playerRecord as PlayerRecord);
      room.navigation.gameMap = room.gameMap;
      room.navigation.positions = room.gameMap.itemPlacement;
      room.navigation.players = room.listPlayers;
      this.emitEventToRoom(
        room.roomId,
        ServerToClientEvent.UpdatePlayerList,
        room.listPlayers
      );
      this.emitEventToRoom(
        room.roomId,
        ServerToClientEvent.UpdateVisual,
        room.listPlayers
      );
    }
  }
}
