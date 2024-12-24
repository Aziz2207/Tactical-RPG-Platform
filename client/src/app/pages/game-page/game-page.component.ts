import { Overlay } from '@angular/cdk/overlay';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { CombatComponent } from '@app/components/combat/combat.component';
import { GameBoxComponent } from '@app/components/game-box/game-box.component';
import { GameInfoDialogComponent } from '@app/components/game-info-dialog/game-info-dialog.component';
import { GameLogComponent } from '@app/components/game-log/game-log.component';
import { GameComponent } from '@app/components/game/game.component';
import { InventoryComponent } from '@app/components/inventory/inventory.component';
import { PlayerListGameComponent } from '@app/components/player-list-game/player-list-game.component';
import { QuitDialogComponent } from '@app/components/quit-dialog/quit-dialog.component';
import { TurnDialogComponent } from '@app/components/turn-dialog/turn-dialog.component';
import { WinnerDialogComponent } from '@app/components/winner-dialog/winner-dialog.component';
import { CombatService } from '@app/services/combat/combat.service';
import { GameService, GameState } from '@app/services/game/game.service';
import { CONSTANTS } from '@common/constants';
import { Player } from '@common/interfaces/player';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-page',
    standalone: true,
    imports: [
        InventoryComponent,
        GameComponent,
        GameBoxComponent,
        ChatComponent,
        CombatComponent,
        PlayerListGameComponent,
        RouterLink,
        GameLogComponent,
        MatIconModule,
    ],
    templateUrl: './game-page.component.html',
    styleUrl: './game-page.component.scss',
})
export class GamePageComponent implements OnInit, OnDestroy {
    size: number;
    nbPlayers: number;
    gameState: GameState;
    players: Player[];
    private dKeyPressed = false;
    private gameOverSubscription: Subscription;

    constructor(
        public gameService: GameService,
        public combatService: CombatService,
        private router: Router,
        public dialog: MatDialog,
        private overlay: Overlay,
    ) {}

    @HostListener('document:keydown', ['$event'])
    handleKeydown(event: KeyboardEvent): void {
        if (event.key === 'd' && !this.dKeyPressed) {
            if (this.gameState.player.isHost) {
                this.gameService.toggleDebugMode();
            }
            this.dKeyPressed = true;
        }
    }

    @HostListener('document:keyup', ['$event'])
    handleKeyup(event: KeyboardEvent): void {
        if (event.key === 'd') {
            this.dKeyPressed = false;
        }
    }

    ngOnInit(): void {
        this.gameService.loadGame();
        this.gameState = this.gameService.gameState;
        if (this.gameState) {
            this.combatService.enableListeners();
            if (this.gameState) this.nbPlayers = this.gameState.players.length;
            if (this.gameState.map) this.size = this.gameState.map._size;
            this.gameService.enableGameListeners();
            this.gameService.setTurnDialogHandler((playerName: string, type: string) => this.showTurnDialog(playerName, type));
            this.gameService.setLastPlayerDialogHandler(() => {
                this.openInfoDialog();
            });
            this.gameService.setGameOverHandler((winner: Player) => {
                this.openWinnerDialog(winner);
            });
        } else {
            this.router.navigate(['/home']);
        }
    }

    showTurnDialog(playerName: string, type: string): void {
        const dialogRef = this.dialog.open(TurnDialogComponent, {
            data: { playerName, type },
            width: '450px',
            height: '275px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['turn-dialog-container'],
        });
        setTimeout(() => dialogRef.close(), CONSTANTS.DIALOG_DELAY);
    }

    ngOnDestroy(): void {
        if (this.gameService.gameState) {
            this.gameService.setLastPlayerDialogHandler(null);
            this.gameService.setGameOverHandler(null);
            this.combatService.reset();
            this.gameService.resetListeners();
        }
        if (this.gameOverSubscription) {
            this.gameOverSubscription.unsubscribe();
        }
    }

    passTurn(): void {
        this.gameService.passTurn();
    }

    quitGame(): void {
        const dialogRef = this.dialog.open(QuitDialogComponent, {
            width: '600px',
            height: '200px',
            scrollStrategy: this.overlay.scrollStrategies.noop(),
            panelClass: ['quit-dialog-container'],
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result === 'yes') {
                this.gameService.quitGame();
                this.router.navigate(['/home']);
            }
        });
    }

    toggleActionMode(): void {
        this.gameState.actionMode = !this.gameState.actionMode;
    }

    openInfoDialog(): void {
        if (!this.dialog.getDialogById('gameInfoDialog')) {
            this.dialog.open(GameInfoDialogComponent, {
                width: '375px',
                height: '250px',
                scrollStrategy: this.overlay.scrollStrategies.noop(),
                panelClass: ['game-info-dialog-container'],
                id: 'gameInfoDialog',
            });
        }
    }

    openWinnerDialog(winner: Player): void {
        if (!this.dialog.getDialogById('winnerDialog')) {
            const dialogRef = this.dialog.open(WinnerDialogComponent, {
                id: 'winnerDialog',
                data: { winner },
                width: '475px',
                height: '220px',
                scrollStrategy: this.overlay.scrollStrategies.noop(),
                panelClass: ['winner-dialog-container'],
            });
            dialogRef.afterClosed().subscribe(() => {
                this.navigateToEndGameStats();
            });
        }
    }

    navigateToEndGameStats(): void {
        this.router.navigate(['/end']);
    }
}
