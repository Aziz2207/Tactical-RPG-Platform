import { Injectable } from "@angular/core";
import {
  PLAYER_STAT_TYPES,
  SortOrder,
  TOTAL_PERCENTAGE,
  VICTORIES_FOR_WIN,
} from "@app/constants";
import { GameMode, ObjectType, TileType } from "@common/constants";
import {
  GlobalPostGameStat,
  GlobalPostGameStats,
} from "@common/interfaces/global-post-game-stats";
import { Behavior, Player, Position, Status } from "@common/interfaces/player";
import {
  PlayerStatType,
  PostGameStat,
} from "@common/interfaces/post-game-stat";
import { Room } from "@common/interfaces/room";
import { SocketCommunicationService } from "../sockets/socket-communication/socket-communication.service";
import { TileService } from "../tile/tile.service";
import { UserAccountService } from "../user-account/user-account/user-account.service";

@Injectable({
  providedIn: "root",
})
export class PostGameService {
  constructor(
    private socketService: SocketCommunicationService,
    private tileService: TileService,
    private userAccountService: UserAccountService
  ) {}

  gameRoom: Room;
  doorsInteractedPercentage: string;
  gameDuration: string;
  globalTilesVisitedPercentage: number;
  totalTerrainTiles: number = -1;
  totalDoors: number = -1;
  explanations: string = "";
  selectedAttribute: string = "";
  sortOrder: { [key: string]: SortOrder } = {
    combats: SortOrder.Unsorted,
    victories: SortOrder.Unsorted,
    draws: SortOrder.Unsorted,
    defeats: SortOrder.Unsorted,
    damageDealt: SortOrder.Unsorted,
    damageTaken: SortOrder.Unsorted,
    itemsObtained: SortOrder.Unsorted,
    tilesVisited: SortOrder.Unsorted,
  };

  globalStats: GlobalPostGameStats = {
    gameDuration: "00:00",
    turns: 0,
    globalTilesVisited: [],
    doorsInteracted: [],
    nbFlagBearers: 0,
  };

  players: Player[];
  tilesGrid: number[][];
  isFlagMode: boolean;
  postGameStatTypes: PostGameStat[] = PLAYER_STAT_TYPES;

  resetOtherAttributes(attribute: keyof Player["postGameStats"]) {
    Object.keys(this.sortOrder).forEach((key) => {
      if (key !== attribute) {
        this.sortOrder[key] = SortOrder.Unsorted;
      }
    });
  }

  toggleSortOrder(attribute: keyof Player["postGameStats"]) {
    this.sortOrder[attribute] =
      this.sortOrder[attribute] === SortOrder.Unsorted ||
      this.sortOrder[attribute] === SortOrder.Ascending
        ? SortOrder.Descending
        : SortOrder.Ascending;
  }

  performSorting(attribute: keyof Player["postGameStats"]) {
    const isAscending = this.sortOrder[attribute] === SortOrder.Ascending;

    this.players.sort((frontElement, backElement) => {
      const frontValue = frontElement.postGameStats[attribute];
      const backValue = backElement.postGameStats[attribute];

      if (frontValue > backValue) return isAscending ? 1 : -1;
      if (frontValue < backValue) return isAscending ? -1 : 1;
      return 0;
    });
  }

  sortPlayers(attribute: keyof Player["postGameStats"]) {
    this.selectedAttribute = attribute;
    this.resetOtherAttributes(attribute);
    this.toggleSortOrder(attribute);
    this.performSorting(attribute);
  }

  updateExplanations(selectedAttribute: keyof Player["postGameStats"] | "") {
    for (const attribute of this.postGameStatTypes) {
      if (attribute.key === selectedAttribute) {
        this.explanations = attribute.explanations;
        return;
      }
    }
    this.explanations = "";
  }

  updateExplanationsGlobal(stat: GlobalPostGameStat) {
    this.explanations = stat.explanations;
  }

  getMaxStat(statKey: keyof Player["postGameStats"]): number {
    return Math.max(
      ...this.players.map((player) => player.postGameStats[statKey])
    );
  }

  countTiles(condition: (tile: number) => boolean): number {
    let count = 0;
    for (const row of this.tilesGrid) {
      for (const tile of row) {
        if (condition(tile)) {
          count++;
        }
      }
    }
    return count;
  }

  findTotalTerrainTiles(): number {
    return this.countTiles((tile) => tile < TileType.Wall);
  }

  findTotalDoors(): number {
    return this.countTiles((tile) => tile > TileType.Wall);
  }

  calculateInteractionPercentage(
    elementList: Position[],
    maxElement: number
  ): number {
    if (maxElement === 0) {
      return -1;
    }
    return Number(
      ((elementList.length / maxElement) * TOTAL_PERCENTAGE).toFixed(2)
    );
  }

  calculateDoorsInteracted(): number {
    return this.calculateInteractionPercentage(
      this.globalStats.doorsInteracted,
      this.tileService.findTotalDoors(this.tilesGrid)
    );
  }

  calculatePlayerTilesVisited() {
    for (const player of this.players) {
      player.postGameStats.tilesVisited = this.calculateInteractionPercentage(
        player.positionHistory,
        this.tileService.findTotalTerrainTiles(this.tilesGrid)
      );
    }
  }

  transferRoomStats(room: Room) {
    this.gameRoom = room;
    if (room.playersRecords && !(room.playersRecords instanceof Map)) {
      room.playersRecords = new Map(Object.entries(room.playersRecords));
    }

    this.tilesGrid = room.gameMap.tiles;
    this.players = [];

    if (room.playersRecords && room.playersRecords.size > 0) {
      // Traiter les joueurs depuis playersRecords
      room.playersRecords.forEach((playerRecord, playerId) => {
        const player = room.listPlayers.find((p) => p.uid === playerId);

        if (player) {
          // Fusionner les données du joueur avec son record
          this.players.push({
            ...player,
            ...playerRecord,
            // Garder les données importantes du player
            positionHistory: player.positionHistory || [],
            collectedItems: player.collectedItems || [],
          });
        } else {
          // Joueur déconnecté - créer avec valeurs par défaut
          this.players.push({
            ...playerRecord,
            status: Status.Disconnected,
            id: playerRecord.uid,
            isActive: false,
            inventory: [],
            position: { x: 0, y: 0 },
            spawnPosition: { x: 0, y: 0 },
            behavior: Behavior.Sentient,
            positionHistory: [],
            collectedItems: [],
          });
        }
      });

      // Ajouter les bots
      const bots = room.listPlayers.filter(
        (player) =>
          player.status === Status.Bot || player.uid.startsWith("bot-")
      );
      this.players.push(...bots);
    } else {
      // Pas de playersRecords, utiliser directement listPlayers
      this.players = room.listPlayers || [];
    }

    console.log("Post stats - Players count:", this.players.length);
    console.log(this.players);
    console.log(room.playersRecords?.size);

    this.globalStats = room.globalPostGameStats;
    this.isFlagMode = room.gameMap.mode === GameMode.CaptureTheFlag;
  }

  computeStats() {
    this.calculatePlayerTilesVisited();
    this.computeDoorsInteractedPercentage();
    this.computeGlobalTilesVisitedPercentage();
    this.calculateUniqueItems();

    if (this.isFlagMode) {
      this.calculateFlagBearers();
    }
  }

  computeGlobalTilesVisitedPercentage() {
    this.totalTerrainTiles = this.tileService.findTotalTerrainTiles(
      this.tilesGrid
    );
    this.globalTilesVisitedPercentage = this.calculateInteractionPercentage(
      this.globalStats.globalTilesVisited,
      this.totalTerrainTiles
    );
  }

  computeDoorsInteractedPercentage() {
    this.totalDoors = this.tileService.findTotalDoors(this.tilesGrid);
    this.doorsInteractedPercentage = this.calculateInteractionPercentage(
      this.globalStats.doorsInteracted,
      this.totalDoors
    ).toString();
    if (this.doorsInteractedPercentage === "-1") {
      this.doorsInteractedPercentage = "NA";
    } else {
      this.doorsInteractedPercentage += "%";
    }
  }

  calculateUniqueItems() {
    for (const player of this.players) {
      if (player.collectedItems) {
        player.postGameStats.itemsObtained = player.collectedItems.length;
      }
    }
  }

  isAttributeVictories(selectedAttribute: keyof Player["postGameStats"]) {
    return selectedAttribute === PlayerStatType.Victories;
  }

  calculateFlagBearers() {
    this.globalStats.nbFlagBearers = this.players.reduce(
      (count, player) =>
        count +
        (player.collectedItems?.filter((itemId) => itemId === ObjectType.Flag)
          .length || 0),
      0
    );
  }

  isCurrentPlayerWinner(): boolean {
    const currentPlayerId = this.getSocketId();
    const currentPlayer = this.players.find((p) => p.id === currentPlayerId);

    if (!currentPlayer) {
      return false;
    }

    const allOthersDisconnected = this.players
      .filter((p) => p.id !== currentPlayerId)
      .every((p) => p.status === Status.Disconnected);

    if (allOthersDisconnected) {
      return true;
    }

    if (this.isFlagMode) {
      return !!currentPlayer.inventory.find(
        (item) => item.id === ObjectType.Flag
      );
    }
    return currentPlayer.postGameStats.victories === VICTORIES_FOR_WIN;
  }
  getUserId() {
    return this.userAccountService.accountDetails?.uid;
  }

  getSocketId() {
    return this.socketService.socket?.id;
  }
}
