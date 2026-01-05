import { Injectable } from '@angular/core';
import { SIZE_LARGE_MAP, SIZE_MEDIUM_MAP, SIZE_SMALL_MAP } from '@app/constants';
import { GameTileInfoService } from '@app/services/game-tile-info/game-tile-info.service';
import { SocketCommunicationService } from '@app/services/sockets/socket-communication/socket-communication.service';
import { GameState, MapSize, TileType } from '@common/constants';
import { Game } from '@common/interfaces/game';
import { Position } from '@common/interfaces/position';
import { ClientToServerEvent } from '@common/socket.events';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: "root",
})
export class GameCreationService {
  sizeSubject = new BehaviorSubject<string | null>(null);
  isNewGame: boolean = true;
  isModifiable: boolean = true;
  loadedTiles: number[][] = [];
  loadedObjects: number[][] = [];
  loadedMapName: string = "";
  loadedMapDescription: string = "";
  loadedMapState: GameState = GameState.Private;
  loadedMapCreatorId: string = "";
  loadedMapCreatorUsername: string = "";
  gameMode: string = "";
  constructor(
    private socketCommunicationService: SocketCommunicationService,
    private gameTileInfoService: GameTileInfoService
  ) {}

  setSelectedSize(size: string) {
    this.sizeSubject.next(size);
  }

  setSelectedMode(mode: string) {
    this.gameMode = mode;
  }

  getGameMode(): string {
    return this.gameMode;
  }

  getStoredSize(): string | null {
    return this.sizeSubject.value;
  }

  updateDimensions(): number | void {
    const size = this.getStoredSize();
    if (size === MapSize.Small) {
      return SIZE_SMALL_MAP;
    } else if (size === MapSize.Medium) {
      return SIZE_MEDIUM_MAP;
    } else if (size === MapSize.Large) {
      return SIZE_LARGE_MAP;
    }
  }

  resetGrid(mapSize: number, array: number[][]): number[][] {
    if (!this.isNewGame) {
      return this.loadedTiles;
    }
    array = Array.from({ length: mapSize }, () =>
      Array(mapSize).fill(TileType.Ground)
    );
    return array;
  }

  rightClick(position: Position) {
    const isMovingAndTileInfoVisible = [];
    isMovingAndTileInfoVisible[1] = this.showDetails(position);
    isMovingAndTileInfoVisible[0] = false;
    return isMovingAndTileInfoVisible;
  }

  showDetails(position: Position) {
    if (!this.isModifiable) {
      this.socketCommunicationService.send(ClientToServerEvent.GetRoomInfo);
      this.gameTileInfoService.selectedRow = position.x;
      this.gameTileInfoService.selectedCol = position.y;
      return true;
    }
    return false;
  }

  deepCopyMatrix(matrix: number[][] | null) {
    return matrix ? JSON.parse(JSON.stringify(matrix)) : [];
  }

  loadExistingTiles() {
    return this.deepCopyMatrix(this.loadedTiles);
  }

  loadExistingObjects() {
    return this.deepCopyMatrix(this.loadedObjects);
  }

  convertMapDimension(game: Game): string {
    if (game.dimension === SIZE_SMALL_MAP) {
      return MapSize.Small;
    } else if (game.dimension === SIZE_MEDIUM_MAP) {
      return MapSize.Medium;
    } else if (game.dimension === SIZE_LARGE_MAP) {
      return MapSize.Large;
    } else {
      return "none";
    }
  }
}
