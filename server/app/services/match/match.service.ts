import { NO_ITEM, SPAWN_POINT_ID } from "@app/constants";
import { RoomService } from "@app/services/room/room.service";
import { TileType } from "@common/constants";
import { Game } from "@common/interfaces/game";
import { Player, Position } from "@common/interfaces/player";
import { Injectable, Logger } from "@nestjs/common";
import { Socket } from "socket.io";

@Injectable()
export class MatchService {
  private game: Game;

  constructor(
    private roomService: RoomService,
    private logger: Logger
  ) {}
  assignPlayerToAvailableSpawnPoint(client: Socket): void {
    const players = this.roomService.getRoom(client).listPlayers;
    this.game = this.roomService.getRoom(client).gameMap;
    const player = players.find((player) => player.uid === client.data.userId);
    if (!player) {
      this.logger.error(
        "Player not found in room MATCHER CLASS FROM handleJoinGame Method"
      );
      return;
    }
    const unusedSpawnPoints = this.getUnusedSpawnPoints(players);
    this.assignPlayerToNearbyPosition(player, players, unusedSpawnPoints);
  }

  processMapObjects(client: Socket): void {
    const players = this.roomService.getRoom(client).listPlayers;
    this.game = this.roomService.getRoom(client).gameMap;
    const spawnPoints = this.getAllSpawnPoints(this.game.itemPlacement);
    this.assignPlayersToSpawnPoints(players, spawnPoints);
  }

  private getAllSpawnPoints(mapObjects: number[][]): Position[] {
    const spawnPoints: Position[] = [];
    for (let x = 0; x < mapObjects.length; x++) {
      for (let y = 0; y < mapObjects[x].length; y++) {
        if (mapObjects[x][y] === SPAWN_POINT_ID) {
          spawnPoints.push({ x, y });
        }
      }
    }
    return spawnPoints;
  }

  private getUnusedSpawnPoints(players: Player[]): Position[] {
    const allSpawnPoints = this.getAllSpawnPoints(this.game.itemPlacement);
    const occupiedPositions = new Set<Position>();

    for (const player of players) {
      if (!player?.spawnPosition) continue;
      occupiedPositions.add({
        x: player.spawnPosition.x,
        y: player.spawnPosition.y,
      });
    }

    return allSpawnPoints.filter((sp) => !occupiedPositions.has(sp));
  }

  private assignPlayerToNearbyPosition(
    player: Player,
    players: Player[],
    spawnPoints: Position[]
  ): void {
    // Trouver un spawn point aléatoire comme référence
    let randomSpawn = spawnPoints[this.getRandomIndex(spawnPoints.length)];
    for (let i = 0; i < spawnPoints.length; i++) {
      randomSpawn = spawnPoints[i];
      if (
        this.isAvailableSpawnPosition(randomSpawn) &&
        !players.some(
          (p) =>
            p.position.x === randomSpawn.x && p.position.y === randomSpawn.y
        )
      )
        break;
    }
    if (
      this.isAvailableSpawnPosition(randomSpawn) &&
      !players.some(
        (p) => p.position.x === randomSpawn.x && p.position.y === randomSpawn.y
      )
    ) {
      player.position = { x: randomSpawn.x, y: randomSpawn.y };
      player.spawnPosition = player.position;
      return;
    }
    // Chercher une position libre autour de ce spawn
    const availablePosition = this.findAvailablePositionAround(
      randomSpawn,
      players
    );

    player.position = { x: availablePosition.x, y: availablePosition.y };
    player.spawnPosition = { x: randomSpawn.x, y: randomSpawn.y };
    this.logger.log(
      `Player ${player.uid} assigned to nearby position ${availablePosition.x},${availablePosition.y}`
    );
  }

  private findAvailablePositionAround(
    spawnPoint: Position,
    players: Player[]
  ): Position | null {
    const directions = [
      { x: 0, y: 1 }, // Bas
      { x: 0, y: -1 }, // Haut
      { x: 1, y: 0 }, // Droite
      { x: -1, y: 0 }, // Gauche
      { x: 1, y: 1 }, // Bas-Droite
      { x: -1, y: 1 }, // Bas-Gauche
      { x: 1, y: -1 }, // Haut-Droite
      { x: -1, y: -1 }, // Haut-Gauche
    ];

    // Chercher dans un rayon croissant (1, 2, 3 cases autour)
    for (let radius = 1; radius <= 3; radius++) {
      for (const dir of directions) {
        const newPos = {
          x: spawnPoint.x + dir.x * radius,
          y: spawnPoint.y + dir.y * radius,
        };

        // Vérifier si la position est dans les limites de la carte
        if (
          newPos.x >= 0 &&
          newPos.y >= 0 &&
          newPos.x < this.game.tiles.length &&
          newPos.y < this.game.tiles[0].length
        ) {
          // Vérifier si la position est une tile valide et libre
          if (
            this.isAvailablePosition({ x: newPos.x, y: newPos.y }) &&
            !players.some(
              (p) => p.position.x === newPos.x && p.position.y === newPos.y
            )
          ) {
            return newPos;
          }
        }
      }
    }

    return null; // Aucune position disponible trouvée
  }

  private isAvailablePosition(position: Position): boolean {
    // Vérifier si la position est une tile valide (pas un mur, obstacle, etc.)
    // Adapter selon votre logique de tiles
    const item = this.game.itemPlacement[position.x]?.[position.y];
    const tile = this.game.tiles[position.x]?.[position.y];

    return (
      item === NO_ITEM && tile !== TileType.ClosedDoor && tile !== TileType.Wall
    );
  }
  private isAvailableSpawnPosition(position: Position): boolean {
    // Vérifier si la position est une tile valide (pas un mur, obstacle, etc.)
    // Adapter selon votre logique de tiles
    const item = this.game.itemPlacement[position.x]?.[position.y];
    const tile = this.game.tiles[position.x]?.[position.y];

    return (
      item === SPAWN_POINT_ID &&
      tile !== TileType.ClosedDoor &&
      tile !== TileType.Wall
    );
  }

  private assignPlayersToSpawnPoints(
    players: Player[],
    spawnPoints: Position[]
  ): void {
    players.forEach((player) => {
      const randomIndex = this.getRandomIndex(spawnPoints.length);
      const selectedSpawnPoint = spawnPoints[randomIndex];
      player.position = { x: selectedSpawnPoint.x, y: selectedSpawnPoint.y };
      player.spawnPosition = player.position;
      spawnPoints.splice(randomIndex, 1);
    });
  }

  private getRandomIndex(max: number): number {
    return Math.floor(Math.random() * max);
  }
}
