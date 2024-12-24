import { NgClass, NgStyle } from '@angular/common';
import { Component, effect, HostListener, OnDestroy } from '@angular/core';
import { GridComponent } from '@app/components/grid/grid.component';
import { CombatService } from '@app/services/combat/combat.service';
import { GameService } from '@app/services/game/game.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { Position } from '@common/interfaces/position';
import { Tile } from '@common/interfaces/tile';
import { TileEnum } from '@common/tile-enum';

@Component({
    selector: 'app-game',
    standalone: true,
    imports: [GridComponent, NgStyle, NgClass],
    templateUrl: './game.component.html',
    styleUrl: './game.component.scss',
})
export class GameComponent implements OnDestroy {
    isRightClicked: boolean = false;
    popupCoordX: number = 0;
    popupCoordY: number = 0;
    popupText: string = '';
    hoverMovementPath: [number, number][] | undefined;

    constructor(
        public gameService: GameService,
        private combatService: CombatService,
        private playerMovementService: PlayerMovementService,
    ) {
        effect(() => {
            this.updateGridStyles(this.gameService.getSize());
        });
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(): void {
        this.isRightClicked = false;
    }

    ngOnDestroy(): void {
        this.combatService.reset();
    }

    updateGridStyles(size: number): void {
        const gridContainer = document.querySelector('.grid-container') as HTMLElement;
        if (gridContainer) {
            gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
            gridContainer.style.gridTemplateRows = `repeat(${size}, 1fr)`;
        }
    }

    onRightClick(event: MouseEvent, x: number, y: number): void {
        event.preventDefault();
        if (this.gameService.isMyTurn() && this.gameService.gameState.debugMode()) {
            this.playerMovementService.teleportPlayer({ x, y });
        } else if (this.gameService.isMyTurn() && this.gameService.gameState.map) {
            this.popupText = '';
            this.isRightClicked = true;
            this.popupCoordX = event.clientX;
            this.popupCoordY = event.clientY;
            const tile = this.gameService.gameState.map._tiles[y][x];
            if (tile.player) this.popupText += `Joueur présent: ${tile.player.userName}\npersonnage: ${tile.player.characterType}`;
            else {
                this.showTileDescription(tile);
            }
        }
    }

    showTileDescription(tile: Tile) {
        switch (tile._tileType) {
            case TileEnum.ClosedDoor:
                this.popupText += "Tuile: Porte fermée\nCoût de déplacement: 1\nIndice: Vous pouvez l'ouvrir si a proximité";
                break;
            case TileEnum.OpenDoor:
                this.popupText += 'Tuile: Porte ouverte\nCoût de déplacement: 1\nIndice: Vous pouvez la fermer si a proximité';
                break;
            case TileEnum.Grass:
                this.popupText += 'Tuile: Terrain\nCoût de déplacement: 1';
                break;
            case TileEnum.Water:
                this.popupText += 'Tuile: Eau\nCoût de déplacement: 2';
                break;
            case TileEnum.Ice:
                this.popupText +=
                    'Tuile: Glace\nCoût de déplacement: 0\nIndice: Peut vous faire glisser et perdre votre tour\nCause un -2 a votre attaque';
                break;
            case TileEnum.Rock:
                this.popupText += 'Tuile: Roche\nIntraversable';
                break;
        }
    }

    onLeftClick(tile: Tile, pos: Position) {
        if (!this.isLeftClickValid(pos)) return;
        const gameState = this.gameService.gameState;
        const isAdjascent = this.isTileAdjacent(pos.x, pos.y);
        if (gameState.actionMode && !gameState.player.hasActed && isAdjascent) {
            if (tile.player) {
                this.combatService.startCombat(tile.player.userName);
                this.gameService.gameState.player.hasActed = true;
            } else if (tile._tileType === TileEnum.ClosedDoor || tile._tileType === TileEnum.OpenDoor) {
                this.playerMovementService.toggleDoor(pos);
                this.gameService.gameState.player.hasActed = true;
            }
            gameState.actionMode = false;
        } else if (!gameState.actionMode && this.hoverMovementPath) {
            this.playerMovementService.movePlayer(this.hoverMovementPath);
        }
    }

    isLeftClickValid(pos: Position): boolean {
        if (!this.gameService.gameState.activePlayer) return false;
        else {
            const clickOnSelf = pos === this.gameService.gameState.activePlayer.position;
            const mapExists = !!this.gameService.gameState.map;
            return !clickOnSelf && mapExists && this.gameService.gameState.yourTurn;
        }
    }

    isTileAvailable(x: number, y: number): boolean {
        return this.gameService.gameState.availableTiles
            ? this.gameService.gameState.availableTiles.some(([tileX, tileY]) => tileX === x && tileY === y)
            : false;
    }

    fastestPath(x: number, y: number) {
        if (this.gameService.gameState.yourTurn && this.isTileAvailable(x, y) && !this.gameService.gameState.actionMode) {
            const position: Position = { x, y };
            const path = this.playerMovementService.findPath(position);
            this.hoverMovementPath = path ? path.map((pos) => [pos.x, pos.y] as [number, number]) : [];
        }
    }

    isInPath(x: number, y: number): boolean {
        return this.hoverMovementPath ? this.hoverMovementPath.some(([px, py]) => px === x && py === y) : false;
    }

    clearPath() {
        this.hoverMovementPath = [];
    }

    isTileAdjacent(x: number, y: number): boolean {
        if (this.gameService.gameState.actionMode && !this.gameService.gameState.player.hasActed) {
            if (!this.gameService.gameState.activePlayer || !this.gameService.gameState.activePlayer.position) {
                return false;
            }
            const playerPos = this.gameService.gameState.activePlayer.position;
            if (!playerPos) return false;
            const adjacentPositions = [
                { x: playerPos.x + 1, y: playerPos.y },
                { x: playerPos.x - 1, y: playerPos.y },
                { x: playerPos.x, y: playerPos.y + 1 },
                { x: playerPos.x, y: playerPos.y - 1 },
            ];
            return adjacentPositions.some((pos) => pos.x === x && pos.y === y);
        } else {
            return false;
        }
    }

    isActionTile(tile: Tile, x: number, y: number): boolean | undefined {
        return tile.player && this.isTileAdjacent(x, y) && this.gameService.gameState.actionMode && !tile.player.hasActed;
    }

    isMovementTile(x: number, y: number): boolean | undefined {
        return this.isTileAvailable(x, y) && (!this.gameService.gameState.actionMode || this.gameService.gameState.player.hasActed);
    }
}
